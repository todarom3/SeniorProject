import pandas as pd
import joblib

#Creates the path to the saved model
MODEL_PATH = "ml/model.joblib"	

#Load the saved model
model = joblib.load(MODEL_PATH)

#Connect to the transaction.csv file 
DATA_PATH = "transactions.csv"
data = pd.read_csv(DATA_PATH)
data_sample = data.head(5)

features = data.drop(columns=["transaction_id", "is_fraud"], errors="ignore")

#test the model on the first 5 rows of the data and print the predictions and probabilities
predictions = model.predict(features)
probabilities = model.predict_proba(features)[:, 1]

#Add predictions and probabilities to the sample data
data_sample["predicted_is_fraud"] = predictions
data_sample["predicted_probability"] = probabilities

#print the results 
print(data_sample)