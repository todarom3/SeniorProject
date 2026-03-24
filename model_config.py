# Model Configuration
# Choose which model the API should load

# Available models:
# "logistic" - Simple logistic regression (toyModel/model.py)
# "neural"   - Neural network (toyModel/neural_model.py)

ACTIVE_MODEL = "logistic"  # Change to "neural" to use neural network

# Model paths
MODEL_PATHS = {
    "logistic": "ml/model.joblib",
    "neural": "ml/neural_model.joblib"
}

# Get the current model path
def get_model_path():
    return MODEL_PATHS[ACTIVE_MODEL]

def get_model_name():
    return ACTIVE_MODEL