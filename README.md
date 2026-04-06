# SeniorProject  
End-to-End Data Analytics Fraud Detection Platform  

Group Members: John Cavanaugh, Matt Todaro, Derek Mendez  

## Full Project Setup Guide

First Clone the Repository
git clone https://github.com/todarom3/SeniorProject.git
cd SeniorProject

## Fake Transaction Generator Setup and Run
3) Run the Java Fake Transaction Generator
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
