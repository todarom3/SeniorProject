import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, average_precision_score, confusion_matrix
import joblib
#this is LOGISITC REGRESSION MODEL, for a neural network model see neural_model.py
# Prefer transactions3.csv, but support common dataset locations in this project.
CSV_CANDIDATES = [
    Path("transactions3.csv"),
    Path("Transactions/transactions3.csv"),
    Path("transactions.csv"),
    Path("Transactions/transactions.csv"),
]
MODEL_OUT = "ml/model.joblib"
C_CANDIDATES = [0.1, 1.0, 10.0]
THRESHOLD_CANDIDATES = [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]
MIN_FRAUD_PRECISION = 0.60

csv_path = next((p for p in CSV_CANDIDATES if p.exists()), None)
if csv_path is None:
    raise FileNotFoundError("No dataset found. Tried: " + ", ".join(str(p) for p in CSV_CANDIDATES))

df = pd.read_csv(csv_path)
print(f"Using dataset: {csv_path}")

# ---- 1) Ensure there's a label ----
# If your data already has is_fraud, use it.
# Otherwise, create a temporary label (toy rule) so you can train something now.
if "is_fraud" not in df.columns:
    # Adjust column name(s) to match your CSV.
    # Common: "amount"
    if "amount" not in df.columns:
        raise ValueError("No 'is_fraud' label and no 'amount' column found. Add a label or update this rule.")
    df["is_fraud"] = (df["amount"] > 500).astype(int)

# ---- 2) Basic feature selection ----
# Drop obvious non-features (IDs). Keep it simple for the toy model.
drop_cols = [c for c in ["is_fraud", "transaction_id"] if c in df.columns]
y = df["is_fraud"].astype(int)
X = df.drop(columns=drop_cols)

# Identify numeric vs categorical
numeric_cols = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
categorical_cols = [c for c in X.columns if c not in numeric_cols]

preprocess = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), numeric_cols),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
    ],
    remainder="drop",
)

# ---- 3) 80/10/10 split (train/validation/test) ----
# First split: 80% train, 20% temp
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Second split of temp: 10% validation, 10% test
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp
)

print(f"Training data size: {len(X_train)}")
print(f"Validation data size: {len(X_val)}")
print(f"Testing data size: {len(X_test)}")

# ---- 4) Tune C on validation PR-AUC ----
best_c = None
best_val_pr_auc = -1.0
best_clf = None

for c in C_CANDIDATES:
    candidate_model = LogisticRegression(
        solver="liblinear",
        max_iter=2000,
        class_weight="balanced",
        C=c,
    )
    candidate_clf = Pipeline(steps=[("preprocess", preprocess), ("model", candidate_model)])
    candidate_clf.fit(X_train, y_train)

    candidate_val_proba = candidate_clf.predict_proba(X_val)[:, 1]
    candidate_val_pr_auc = average_precision_score(y_val, candidate_val_proba)
    print(f"Validation PR-AUC with C={c}: {candidate_val_pr_auc:.6f}")

    if candidate_val_pr_auc > best_val_pr_auc:
        best_val_pr_auc = candidate_val_pr_auc
        best_c = c
        best_clf = candidate_clf

clf = best_clf
print(f"Selected C: {best_c}")

# Validation evaluation
val_proba = clf.predict_proba(X_val)[:, 1]

# ---- 5) Tune decision threshold on validation set ----
# Choose the threshold with highest recall while keeping at least minimum precision.
best_threshold = None
best_threshold_recall = -1.0

for threshold in THRESHOLD_CANDIDATES:
    threshold_pred = (val_proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_val, threshold_pred, labels=[0, 1]).ravel()

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

    if precision >= MIN_FRAUD_PRECISION and recall > best_threshold_recall:
        best_threshold_recall = recall
        best_threshold = threshold

if best_threshold is None:
    # Fallback if no threshold meets minimum precision.
    best_threshold = 0.50

print(f"Selected threshold: {best_threshold:.2f} (min precision target: {MIN_FRAUD_PRECISION:.2f})")

val_pred = (val_proba >= best_threshold).astype(int)

print("\nValidation metrics")
print(classification_report(y_val, val_pred, digits=4))
print("Validation PR-AUC:", average_precision_score(y_val, val_proba))

# Test evaluation
test_proba = clf.predict_proba(X_test)[:, 1]
test_pred = (test_proba >= best_threshold).astype(int)

print("\nTest metrics")
print(classification_report(y_test, test_pred, digits=4))
print("Test PR-AUC:", average_precision_score(y_test, test_proba))

# Confusion matrix layout: [[TN, FP], [FN, TP]]
cm = confusion_matrix(y_test, test_pred, labels=[0, 1])
print(f"Decision threshold: {best_threshold:.2f}")
print("Confusion matrix [[TN, FP], [FN, TP]]:")
print(cm)

Path(MODEL_OUT).parent.mkdir(parents=True, exist_ok=True)
joblib.dump(clf, MODEL_OUT)
print(f"Saved model to {MODEL_OUT}")