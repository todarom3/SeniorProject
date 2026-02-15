import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, average_precision_score
import joblib

CSV_PATH = "transactions.csv"   
MODEL_OUT = "ml/model.joblib"

df = pd.read_csv(CSV_PATH)

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

model = LogisticRegression(max_iter=2000, class_weight="balanced")

clf = Pipeline(steps=[("preprocess", preprocess), ("model", model)])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

clf.fit(X_train, y_train)

# Predictions + evaluation
proba = clf.predict_proba(X_test)[:, 1]
pred = (proba >= 0.5).astype(int)

print(classification_report(y_test, pred, digits=4))
print("PR-AUC:", average_precision_score(y_test, proba))

joblib.dump(clf, MODEL_OUT)
print(f"Saved model to {MODEL_OUT}")