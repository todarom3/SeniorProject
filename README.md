# SeniorProject  
End-to-End Data Analytics Fraud Detection Platform  

Group Members: John Cavanaugh, Matt Todaro, Derek Mendez  

## Full Project Setup Guide

First Clone the Repository  
git clone https://github.com/todarom3/SeniorProject.git  
cd SeniorProject  

## Fake Transaction Generator Setup and Run  
The fake transaction generator is located in:  
FakeTransactionGenerator/src/  

Compile  
From inside the src folder:  
javac CCTransactionGenerator2.java  

Run  
java CCTransactionGenerator2  

This generates:  
transactions3.csv and fraud_log.csv  
These files are used for fraud analysis and model training.   


## Toy Model Setup & Run

From the project root:

- Create environment: `/usr/bin/python3 -m venv .venv`
- Install dependencies: `./.venv/bin/python -m pip install --upgrade pip && ./.venv/bin/python -m pip install -r requirements.txt`

Run scripts:

- Train and evaluate model (prints 80/10/10 split metrics and saves model): `./.venv/bin/python toyModel/model.py`
- Inference sanity check (loads saved model and prints sample predictions): `./.venv/bin/python tests/testModel.py`

## Dashboard Usage (Deployed on Vercel)

The dashboard is fully deployed using Vercel, so no local setup is required to use it.

### How to Use

1. Open the deployed dashboard in your browser: https://senior-project-beryl.vercel.app/  
2. Click **"Choose File"** and upload a CSV file (such as `transactions3.csv` generated from the Fake Transaction Generator)  
3. Click **"Upload and Analyze"**  
4. Wait for the loading screen to complete  
5. View the results in the dashboard  

---

### What the Dashboard Shows

- **Transaction Table**
  - Displays all transactions from the uploaded file
  - Transaction ID represents the order the transactions were generated
  - Credit card numbers are masked (only last 4 digits shown)

- **Fraud Predictions**
  - Each transaction is labeled as fraud or non-fraud
  - Fraud probability is displayed (capped below 100% for realism)

- **Fraud Reasoning**
  - Shows the top factors that contributed to the fraud prediction
  - Helps explain why the model flagged a transaction

- **Charts and Metrics**
  - Fraud vs Non-Fraud distribution
  - Fraud by location
  - Transactions by device
  - Summary metrics (total transactions, fraud count, fraud rate, etc.)

---

### How It Works

1. The uploaded CSV file is sent to the backend API  
2. The backend processes the data and feeds it into the trained machine learning model  
3. The model returns:
   - A fraud prediction (yes/no)
   - A probability score
   - Top contributing features (reasoning)
4. The frontend dashboard displays the results in tables and charts  

---

### Notes

- The system uses **synthetic transaction data** (not real financial data)  
- Transaction IDs reflect generation order, not timestamps  
- The dashboard is designed to demonstrate a full data pipeline from input → model → visualization  

## System Diagram  

![System Diagram](./SystemDiagram/SystemDiagram.png)
