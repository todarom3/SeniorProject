John Cavanaugh: Project notes:  

Week 0: On this week I formed my group and began brainstorming potential project ideas. We discussed different domains and ultimately started focusing on building a fraud detection system that could combine data generation, analysis, and visualization.

Week 1: On this week I helped finalize the project idea and contributed to writing the initial project description and README. We defined the overall system goals and started outlining how the full data pipeline would work from data generation to output.

Week 2: On this week I researched real-world transaction data sources to understand what features and patterns are commonly used in fraud detection. I also began building a Java-based synthetic data generator to create realistic transaction data for our system. The generator is saved under the FakeTransactionGenerator folder as CCTransactionGenerator.java

Week 3: On this week I developed an initial rule-based fraud detection component in Java that identifies common fraud patterns and assigns a fraud probability score to suspicious transactions. This rule based detection is saved as FraudProbabilityChecker.java. I also improved the data generator so it could intentionally simulate fraudulent behavior based on those patterns.

Week 4: On this week I set up SQLite for the project and defined the structure for storing transaction data. I also wrote a Java program to insert generated CSV data into the database and started researching ways to improve the accuracy and logic of our fraud detection approach. The file is called CSVToDatabaseImporter.java

Week 5: On this week I significantly improved the transaction generator by expanding coverage to all 50 states and adding more merchant categories and transaction types. I also enhanced fraud detection patterns, including location inconsistency detection and unusual spending behavior after card compromise. The updated dataset was saved as transactions2.csv.

Week 6: On this week I started to create the midterm presentation and worked on planning how all parts of the system would connect into one complete application. I also met up and collaborated with the team as we introduced machine learning into the project, transitioning away from purely rule-based detection.

Week 7: On this week I finalized and refined the midterm presentation. I also helped organize the remaining development tasks for the semester, focusing on system integration and making sure each component could work together smoothly.

Week 8: On this week we delivered the midterm presentation. After presenting, I began improving the transaction generator further to make it more realistic and better aligned with real-world fraud scenarios and behaviors.

Week 9: On this week I completed a major upgrade to the transaction generator, making it significantly more advanced and realistic. I added additional transaction features, improved randomness and variation, and expanded fraud simulation logic to include more complex scenarios such as sudden high-value purchases, rapid transaction sequences, and behavioral inconsistencies across locations and devices. I also refined merchant diversity and improved the overall structure of the generated dataset. This new data was saved as transactions3.csv, and the new data generator is called CCTransactionGenerator2.java. In addition, I created a detailed documentation file called FakeTransactionInfo.txt, which explains how the generator works and clearly outlines all fraud patterns included in the system.

Week 10: On this week (Spring Break), I made improvements to the project documentation by updating the README with clearer setup and usage instructions. I also reorganized project information by moving general details into a separate file for better structure and readability. Additionally, I helped figure out what was left to do regarding the dashboard and machine learning model.

Week 11: On this week I designed and finalized the system diagram that visually represents how all components of the project interact. I organized the diagram and related files into the SystemDiagram folder to ensure everything is clearly structured for presentation.

Week 12: On this week I completed the final draft of the project poster. I combined all major components of the project, including goals, system overview, technologies used, accomplishments, and future improvements, into a clean and organized layout suitable for presentation.



