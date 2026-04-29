"""
inference.py — reusable prediction module for the fraud detection pipeline.

Load the saved model and run predictions on a DataFrame of transactions.
This is what the API and any scripts should call instead of duplicating logic.

Usage:
    from model.inference import predict_transactions

    import pandas as pd
    df = pd.read_csv("Transactions/transactions3.csv")
    results = predict_transactions(df)
    print(results[["transaction_id", "predicted_is_fraud", "predicted_probability", "top_reasons"]])
"""

from pathlib import Path
import sys

import joblib
import numpy as np
import pandas as pd

# Allow running directly from the project root
sys.path.append(str(Path(__file__).resolve().parent.parent))
from model_config import get_model_path

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_CANDIDATES = [
    BASE_DIR / get_model_path(),
    BASE_DIR / "ml" / "model.joblib",
]


def load_model():
    """Load the saved model from disk. Raises FileNotFoundError if not found."""
    for candidate in MODEL_CANDIDATES:
        if candidate.exists():
            return joblib.load(candidate)
    raise FileNotFoundError(
        "No model file found. Run model/model.py first to train and save the model.\n"
        "Tried: " + ", ".join(str(p) for p in MODEL_CANDIDATES)
    )


def prepare_features(df: pd.DataFrame, model) -> pd.DataFrame:
    """
    Strip non-feature columns and align the DataFrame to match what the
    model was trained on. Adds missing columns with safe defaults.
    """
    features = df.copy()

    features = features.drop(columns=["transaction_id", "is_fraud"], errors="ignore")

    if "is_potential_fraud" not in features.columns:
        features["is_potential_fraud"] = 0

    expected_columns = getattr(model, "feature_names_in_", None)
    if expected_columns is not None:
        expected_columns = list(expected_columns)
        for col in expected_columns:
            if col not in features.columns:
                features[col] = 0 if col in ["amount", "is_potential_fraud"] else ""
        features = features.reindex(columns=expected_columns)

    return features


def top_reasons_for_fraud(
    model,
    features: pd.DataFrame,
    top_k: int = 3,
) -> list:
    """
    Lightweight explainability for logistic regression models.
    Returns the top contributing features per row using: contribution = x_i * coef_i.

    Returns a list of lists — one inner list per row — each containing dicts with
    'feature' and 'contribution' keys.
    """
    pipeline_steps = getattr(model, "named_steps", {})
    preprocess = pipeline_steps.get("preprocess")
    estimator = pipeline_steps.get("model")

    if preprocess is None or estimator is None or not hasattr(estimator, "coef_"):
        return [[] for _ in range(len(features))]

    transformed = preprocess.transform(features)
    coef = estimator.coef_[0]
    feature_names = [
        _clean_feature_name(name) for name in preprocess.get_feature_names_out()
    ]

    all_reasons = []

    for i in range(transformed.shape[0]):
        row = transformed[i]
        row_vector = row.toarray().ravel() if hasattr(row, "toarray") else np.asarray(row).ravel()

        contributions = row_vector * coef
        positive_idx = np.where(contributions > 0)[0]

        if len(positive_idx) == 0:
            all_reasons.append([])
            continue

        sorted_idx = positive_idx[np.argsort(contributions[positive_idx])[::-1]]
        top_idx = sorted_idx[:top_k]

        all_reasons.append([
            {"feature": str(feature_names[j]), "contribution": float(contributions[j])}
            for j in top_idx
        ])

    return all_reasons


def _clean_feature_name(name: str) -> str:
    if "__" in name:
        name = name.split("__", 1)[1]
    return name


def predict_transactions(df: pd.DataFrame, model=None) -> pd.DataFrame:
    """
    Run fraud predictions on a DataFrame of transactions.

    Parameters
    ----------
    df : pd.DataFrame
        Raw transaction data. Column names are normalized automatically.
    model : optional
        Pre-loaded model object. If None, the saved model is loaded from disk.

    Returns
    -------
    pd.DataFrame
        The original DataFrame with three new columns added:
        - predicted_is_fraud   (int: 0 or 1)
        - predicted_probability (float: 0.0 – 1.0)
        - top_reasons          (list of dicts with 'feature' and 'contribution')
    """
    if model is None:
        model = load_model()

    result = df.copy()
    features = prepare_features(result, model)

    result["predicted_is_fraud"] = model.predict(features)
    result["predicted_probability"] = model.predict_proba(features)[:, 1]
    result["top_reasons"] = top_reasons_for_fraud(model, features)

    return result


# ── Quick smoke test when run directly ───────────────────────────────────────
if __name__ == "__main__":
    CSV_CANDIDATES = [
        BASE_DIR / "Transactions" / "transactions3.csv",
        BASE_DIR / "transactions.csv",
    ]

    csv_path = next((p for p in CSV_CANDIDATES if p.exists()), None)
    if csv_path is None:
        raise FileNotFoundError("No transactions CSV found to test with.")

    print(f"Loading data from: {csv_path}")
    sample = pd.read_csv(csv_path).head(10)

    results = predict_transactions(sample)

    print(f"\nPredictions for {len(results)} transactions:")
    print(
        results[["transaction_id", "predicted_is_fraud", "predicted_probability", "top_reasons"]]
        .to_string(index=False)
    )

    fraud_count = results["predicted_is_fraud"].sum()
    print(f"\nFraud detected: {fraud_count} / {len(results)}")
