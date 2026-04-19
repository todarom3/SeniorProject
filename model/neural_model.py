import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, average_precision_score
import joblib
import warnings
warnings.filterwarnings('ignore')

# Prefer transactions3.csv, but support common project dataset locations.
CSV_CANDIDATES = [
    Path("transactions3.csv"),
    Path("Transactions/transactions3.csv"),
    Path("transactions.csv"),
    Path("Transactions/transactions.csv"),
]
MODEL_OUT = "ml/neural_model.joblib"

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

# Neural Network Configuration
# Start with a moderate architecture - can be tuned for your specific dataset
neural_net = MLPClassifier(
    hidden_layer_sizes=(128, 64, 32),  # 3 hidden layers with decreasing neurons
    activation='relu',                  # ReLU activation for hidden layers
    solver='adam',                     # Adam optimizer for better convergence
    alpha=0.001,                       # L2 regularization to prevent overfitting
    batch_size='auto',                 # Automatic batch size selection
    learning_rate='adaptive',          # Adaptive learning rate
    learning_rate_init=0.001,         # Initial learning rate
    max_iter=500,                     # Maximum iterations
    early_stopping=True,              # Stop early if no improvement
    validation_fraction=0.1,          # 10% of training data for validation
    n_iter_no_change=20,              # Patience for early stopping
    random_state=42,                  # Reproducible results
    verbose=True                      # Show training progress
)

clf = Pipeline(steps=[("preprocess", preprocess), ("model", neural_net)])

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

print("\nTraining neural network...")
clf.fit(X_train, y_train)

# Validation evaluation
val_proba = clf.predict_proba(X_val)[:, 1]
val_pred = (val_proba >= 0.5).astype(int)

print("\nValidation metrics")
print(classification_report(y_val, val_pred, digits=4))
print(f"Validation PR-AUC: {average_precision_score(y_val, val_proba):.4f}")

# Test evaluation
test_proba = clf.predict_proba(X_test)[:, 1]
test_pred = (test_proba >= 0.5).astype(int)

print("\nTest metrics")
print(classification_report(y_test, test_pred, digits=4))
print(f"Test PR-AUC: {average_precision_score(y_test, test_proba):.4f}")

# Neural network specific metrics
print(f"\nNeural Network Info:")
print(f"Training iterations: {clf.named_steps['model'].n_iter_}")
print(f"Training loss: {clf.named_steps['model'].loss_:.4f}")

Path(MODEL_OUT).parent.mkdir(parents=True, exist_ok=True)
joblib.dump(clf, MODEL_OUT)
print(f"Saved neural network model to {MODEL_OUT}")