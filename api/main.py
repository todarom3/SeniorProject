from pathlib import Path
import re
from typing import Any, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml" / "model.joblib"
TRANSACTIONS_PATH = BASE_DIR / "transactions.csv"
OUTPUTS_DIR = BASE_DIR / "outputs"

app = FastAPI(title="Fraud Detection API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_latest_model_output_file() -> Optional[Path]:
    if not OUTPUTS_DIR.exists():
        return None
    candidates = sorted(OUTPUTS_DIR.glob("model_run_*.txt"), key=lambda p: p.stat().st_mtime, reverse=True)
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/model/latest-run")
def latest_run() -> dict[str, Any]:
    latest = _get_latest_model_output_file()
    if latest is None:
        raise HTTPException(status_code=404, detail="No model run output files found in outputs/.")

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

    features = data.drop(columns=["transaction_id", "is_fraud", "is_potential_fraud"], errors="ignore")

    predictions = model.predict(features)
    probabilities = model.predict_proba(features)[:, 1]

    data["predicted_is_fraud"] = predictions
    data["predicted_probability"] = probabilities

    return {
        "count": len(data),
        "rows": data.to_dict(orient="records"),
    }


@app.get("/transactions/with-predictions")
def transactions_with_predictions(limit: int = Query(default=200, ge=1, le=5000)) -> dict[str, Any]:
    model = _load_model()
    data = _load_transactions().head(limit).copy()

    features = data.drop(columns=["transaction_id", "is_fraud", "is_potential_fraud"], errors="ignore")

    data["predicted_is_fraud"] = model.predict(features)
    data["predicted_probability"] = model.predict_proba(features)[:, 1]

    return {
        "count": len(data),
        "rows": data.to_dict(orient="records"),
    }
