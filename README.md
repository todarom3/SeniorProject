# SeniorProject  
End-to-End Data Analytics Fraud Detection Platform

Group Members: John Cavanaugh, Matt Todaro, Derek Mendez  

Project Overview:  
This project is an end-to-end data analytics platform focused on detecting financial fraud, particularly, fraudulent credit card transactions.  
The system ingests transaction data, cleans and stores it in a relational database, applies rule-based analysis and machine learning techniques to identify potentially fraudulent behavior, and visualizes the results in a dashboard.  
The goal is to simulate a real-world fraud detection system by building a complete data pipeline rather than relying on isolated scripts or notebooks.  

Project Goal:  
The goal of this project is to design and implement a full data analytics pipeline for fraud detection.  
The system demonstrates how raw transaction data flows through ingestion, storage, analysis, and visualization while reinforcing concepts in software development, databases, and data analysis.  

Project Domain:  
The project domain is financial fraud detection   
The system primarily uses synthetic transaction data designed to mimic real-world purchasing behavior   
Public datasets may be referenced for validation and comparison  

Expected Deliverables:  
A complete data pipeline that ingests and processes transaction data  
A relational SQL database populated with cleaned transaction data  
Fraud detection logic using statistical analysis and or machine learning  
A dashboard visualizing fraud trends and flagged transactions  
A GitHub repository containing all source code and documentation  
A final report/presentation explaining system design and results  
High-Level Pipeline
Ingest raw transaction data
Clean and transform the data
Store processed data in a SQL database
Analyze data and detect potential fraud
Visualize results in a dashboard

Technologies Used:  
Java for synthetic data generation and data ingestion into the database  
Python for data analysis and machine learning using Pandas and scikit-learn  
SQLite for relational database design and SQL querying  
Custom ETL pipeline for data cleaning, transformation, and loading  
FastAPI for building a REST API to expose fraud detection results  
Streamlit for creating an interactive dashboard to visualize fraud trends and flagged transactions  

Motivation:  
The motivation for this project comes from our interest in building a system that combines skills we have already learned with new, practical technologies.
We wanted to apply our knowledge of Java and SQL in a realistic project while also learning useful skills in Python, data analysis, and machine learning.
Fraud detection is a relevant real-world problem that provides insight into how modern data pipelines and analytics systems are used in industry.

Project Timeline:  
This is the proposed timeline for our project, things can and will change along the way, but this serves as a rough idea of how we will be approaching it  

Proposed 15-Week Timeline:

Week 1: Project Planning & Setup:  
Finalize project scope and requirements  
Define transaction data schema  
Create GitHub repository and README  
Assign team roles and responsibilities  

Week 2: Data Research & Design:  
Begin coding realistic synthetic transaction data generator  
Implement basic transaction fields (amount, merchant, timestamp, location)  
Research transaction data formats and fraud patterns  
Identify common fraud indicators
Document rules that generator should simulate  
Explore public datasets for realism reference  

Week 3: Synthetic Data Generation:  
Update the synthetic data generator to purposely generate fraudelent transactions based on patterns  
Begin working on a toy model in which a transaction can be checked for fraud based on patterns  
Start working on setting up the database  

Week 4: Database and Toy Model Implementation:  
Finish setting up SQL database (SQLite)  
Create tables and relationships  
Load transaction data into the database  
Continue working on the toy model  

Week 5: Improvements and Updates:  
Improve the transaction generator and checker to account for more fraud patterns  
Update the dashboard to reflect the rceent work done  
Update the database with more info  
Improve the toy model  

// Future weeks will be updated to reflect what was actually done  

Week 6: Bringing everything together for the midterm:  
Start to make sure we connect the data ingestion, model, dashboard, and database together to be able to show for the midterm  

Week 7: Exploratory Data Analysis:  
Write SQL queries to explore transaction patterns  
Identify basic fraud indicators  
Summarize trends and anomalies  

Week 8: Rule-Based Fraud Detection:  
Implement simple fraud detection rules  
Flag suspicious transactions  
Evaluate rule-based results  

Week 9: Machine Learning Preparation:  
Prepare datasets for machine learning  
Select appropriate fraud detection models  
Define evaluation metrics  

Week 10: Machine Learning Model Development:  
Train and test initial ML models  
Compare model performance  
Select final model approach  

Week 11: Model Integration:  
Integrate ML results with database  
Store fraud predictions and scores  
Validate model outputs  

Week 12: API Development:  
Build REST API to access fraud results  
Connect database to backend services  
Test API endpoints  

Week 13: Dashboard Development:  
Design and implement dashboard UI  
Visualize fraud trends and flagged transactions  
Connect dashboard to API  

Week 14: System Integration & Testing:  
Run full pipeline end-to-end  
Fix bugs and performance issues  
Finalize documentation  

Week 15: Final Polish & Presentation:  
Prepare final demo and presentation  
Clean up code and repository  
Submit final deliverables  

## Toy Model Setup & Run

From the project root:

- Create environment: `/usr/bin/python3 -m venv .venv`
- Install dependencies: `./.venv/bin/python -m pip install --upgrade pip && ./.venv/bin/python -m pip install -r requirements.txt`

Run scripts:

- Train and evaluate model (prints 80/10/10 split metrics and saves model): `./.venv/bin/python toyModel/model.py`
- Inference sanity check (loads saved model and prints sample predictions): `./.venv/bin/python tests/testModel.py`
