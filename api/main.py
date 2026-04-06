from pathlib import Path
import os
import re
from typing import Any, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent))
from model_config import get_model_path, get_model_name

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / get_model_path()
TRANSACTIONS_PATH = BASE_DIR / "transactions.csv"
OUTPUTS_DIR = BASE_DIR / "outputs"

app = FastAPI(title="Fraud Detection API", version="0.1.0")

extra_origin = os.getenv("FRONTEND_ORIGIN")

allow_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if extra_origin:
    allow_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_latest_model_output_file() -> Optional[Path]:
    if not OUTPUTS_DIR.exists():
        return None
    candidates = sorted(
        OUTPUTS_DIR.glob("model_run_*.txt"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return candidates[0] if candidates else None


def _parse_model_output(text: str) -> dict[str, Any]:
    parsed: dict[str, Any] = {}

    size_patterns = {
        "train_size": r"Training data size:\s*(\d+)",
        "validation_size": r"Validation data size:\s*(\d+)",
        "test_size": r"Testing data size:\s*(\d+)",
    }
    for key, pattern in size_patterns.items():
        match = re.search(pattern, text)
        if match:
            parsed[key] = int(match.group(1))

    validation_pr_auc = re.search(r"Validation PR-AUC:\s*([0-9eE+\-.]+)", text)
    test_pr_auc = re.search(r"Test PR-AUC:\s*([0-9eE+\-.]+)", text)

    if validation_pr_auc:
        parsed["validation_pr_auc"] = float(validation_pr_auc.group(1))
    if test_pr_auc:
        parsed["test_pr_auc"] = float(test_pr_auc.group(1))

    accuracy_matches = re.findall(r"accuracy\s+([0-9.]+)\s+\d+", text)
    if accuracy_matches:
        if len(accuracy_matches) >= 1:
            parsed["validation_accuracy"] = float(accuracy_matches[0])
        if len(accuracy_matches) >= 2:
            parsed["test_accuracy"] = float(accuracy_matches[1])

    return parsed


def _load_model():
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=404, detail="Model not found. Run toyModel/model.py first.")
    return joblib.load(MODEL_PATH)


def _load_transactions() -> pd.DataFrame:
    if not TRANSACTIONS_PATH.exists():
        raise HTTPException(status_code=404, detail="transactions.csv not found.")
    return pd.read_csv(TRANSACTIONS_PATH)


def _prepare_features(data: pd.DataFrame, model) -> pd.DataFrame:
    features = data.copy()

    # These are never true model targets for prediction input
    features = features.drop(columns=["transaction_id", "is_fraud"], errors="ignore")

    # Your current saved model expects this column, but the new CSV does not include it.
    if "is_potential_fraud" not in features.columns:
        features["is_potential_fraud"] = 0

    # If the model exposes the exact columns it was trained on, force the upload
    # to match that order and fill any missing columns safely.
    expected_columns = getattr(model, "feature_names_in_", None)

    if expected_columns is not None:
        expected_columns = list(expected_columns)

        for col in expected_columns:
            if col not in features.columns:
                # Fill missing columns with safe defaults
                if col in ["amount", "is_potential_fraud"]:
                    features[col] = 0
                else:
                    features[col] = ""

        # Drop any extra uploaded columns the model was not trained on
        features = features.reindex(columns=expected_columns)

    return features


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/model/info")
def model_info() -> dict[str, str]:
    # Return information about the currently active model.
    try:
        model_name = get_model_name()
        model_path = get_model_path()
        model_exists = (BASE_DIR / model_path).exists()
        
        return {
            "active_model": model_name,
            "model_path": model_path,
            "model_exists": model_exists,
            "status": "ready" if model_exists else "model_not_found"
        }
    except Exception as e:
        return {
            "active_model": "unknown",
            "status": "error",
            "error": str(e)
        }


@app.get("/model/latest-run")
def latest_run() -> dict[str, Any]:
    latest = _get_latest_model_output_file()
    if latest is None:
        raise HTTPException(
            status_code=404,
            detail="No model run output files found in outputs/.",
        )

    text = latest.read_text(encoding="utf-8")
    parsed = _parse_model_output(text)

    return {
        "file": str(latest.relative_to(BASE_DIR)),
        "updated_at": latest.stat().st_mtime,
        "parsed_metrics": parsed,
        "raw_output": text,
    }


@app.get("/model/predict-sample")
def predict_sample(limit: int = Query(default=10, ge=1, le=100)) -> dict[str, Any]:
    model = _load_model()
    data = _load_transactions().head(limit).copy()

    features = _prepare_features(data, model)

    predictions = model.predict(features)
    probabilities = model.predict_proba(features)[:, 1]

    data["predicted_is_fraud"] = predictions
    data["predicted_probability"] = probabilities

    return {
        "count": len(data),
        "rows": data.to_dict(orient="records"),
    }


@app.get("/transactions/with-predictions")
def transactions_with_predictions(
    limit: int = Query(default=200, ge=1, le=5000),
) -> dict[str, Any]:
    model = _load_model()
    data = _load_transactions().head(limit).copy()

    features = _prepare_features(data, model)

    data["predicted_is_fraud"] = model.predict(features)
    data["predicted_probability"] = model.predict_proba(features)[:, 1]

    return {
        "count": len(data),
        "rows": data.to_dict(orient="records"),
    }


@app.post("/transactions/upload")
async def upload_transactions(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    try:
        data = pd.read_csv(file.file).copy()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read CSV file: {str(e)}",
        )

    if data.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty.")

    model = _load_model()
    features = _prepare_features(data, model)

    try:
        data["predicted_is_fraud"] = model.predict(features)
        data["predicted_probability"] = model.predict_proba(features)[:, 1]
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=(
                "Prediction failed. Check that the uploaded CSV has the correct "
                f"columns and data types. Error: {str(e)}"
            ),
        )

    fraud_count = int(data["predicted_is_fraud"].sum())
    total_count = int(len(data))
    fraud_rate = float((fraud_count / total_count) * 100) if total_count > 0 else 0.0

    total_amount = 0.0
    if "amount" in data.columns:
        total_amount = float(
            pd.to_numeric(data["amount"], errors="coerce").fillna(0).sum()
        )

    return {
        "count": total_count,
        "summary": {
            "total_transactions": total_count,
            "fraud_count": fraud_count,
            "fraud_rate": fraud_rate,
            "total_amount": total_amount,
        },
        "rows": data.to_dict(orient="records"),
    }