2/3 - 2/10:
(Old basic dashboard removed)
This week, I wanted to get github desktop and eclipse connected to this project, but I was having trouble so I will need to keep working on that.
I was able to get a basic Dashboard set up using John's files, however I must change the design in the future. My goal is to make it pleasing to look at, hold more data, contains charts, and more. 

2/10 - 2/17:
This week, I researched vuejs and react to come up with a design for the dashboard. I wanted to see what these websites had to offer, and they gave me a much better understanding on what I need to do in order to design a productive dashboard. I plan on coming up with a base model for the dashboard in the upcoming weeks.

2/17 – 2/24:
This week, I significantly expanded the functionality of the Fraud Detection Dashboard. I implemented full transaction pagination, ensuring that all transactions from the dataset are displayed in descending order by timestamp. The most recent transactions now appear first, with older transactions accessible through page navigation controls.
I also improved the user interface and formatting of the transaction table. Additionally, I added summary analytics.
Finally, I deployed the React (Vite) frontend using Vercel, making the dashboard publicly accessible.

Live Dashboard Deployment:
https://senior-project-beryl.vercel.app/
This deployment marks the first fully functional, publicly accessible version of the Fraud Detection Dashboard.

2/24 - 3/3:
This week, I continued improving the Fraud Detection Dashboard and focused on integrating it with the machine learning model used by the group. Instead of loading the CSV file directly into the dashboard, I updated the system so that uploaded transaction data is sent to the backend API, processed by the fraud detection model, and then returned to the dashboard with prediction results. This allows the dashboard to display real model output instead of static data.

3/3 - 3/10:
This week, I focuded on making several user interface improvements to the dashboard. I redesigned the layout to be fully centered, changed the font styling, added additional charts including a pie chart for fraud vs non-fraud results, and improved pagination by allowing users to jump directly to a specific page instead of clicking through every page. I also added minimize/expand controls for dashboard sections so the layout can be customized while viewing large datasets.

3/10 - 3/17: 
This week, it was most important to focus on preparation for the presentation. Our group made a slideshow in order to show what we worked on so far. I also made flashcards so that I am prepared to speak during the presentation. I want to make sure everyone understands my role in the project and I can receive feedback in order to expand upon what has been created so far. 

3/17 - 3/24: This week, I continued improving both the functionality and usability of the Fraud Detection Dashboard. I updated the backend and frontend so the dashboard can work with a newer transaction file format, and I expanded the transaction table so it displays all of the fields in the uploaded CSV, including card number, merchant, category, location, device, amount, and timestamp. I also made several interface improvements to help users work with larger datasets more effectively. I adjusted the chart layout, resized visual components, added an additional chart to show transactions by device, and created a tab-style sidebar so that multiple uploaded transaction files can be stored and switched between inside the dashboard. I then added local browser storage so uploaded tabs remain available even after the page is refreshed, making the dashboard feel more like a multi-session analytics workspace.

3/24 - 3/31: This week, I focused on making the backend accessible beyond my local computer so that the dashboard could eventually work for all users online. I organized the project so the frontend and backend could be deployed separately, with the React dashboard hosted as one Vercel project and the FastAPI backend prepared as a second deployment. This is important because the dashboard depends on the backend API to process uploaded transaction files through the machine learning model and return fraud prediction results.

3/31 - 4/7: I did not commit changes yet, however I have been working on improving the dashboard some more. I want to make sure it looks perfect before I commit any changes. I verified that the deployed backend is successfully running the saved machine learning model rather than just the training code. I confirmed that the active deployed model is the logistic regression model stored at ml/model.joblib. In addition, I worked on improving the dashboard experience by planning and adding a more informative loading screen, a model status/proof section, and a high-risk transactions view so users can better understand what is happening behind the scenes and see clear evidence that the fraud model ran successfully.

4/7 - 4/14: This week, I commited my changes but still had to make some changes to the loading screen. The loading would finish before the loading screen was fully completed, so I needed to make changes to fix that. I also moved files into their respective folders and deleted files that we did not need anymore.

4/14 - 4/21: This week, I added a new column to the dashboard that explains why fraudulent transactions were detected as fraudulent. I also had to fix the table, since some of the information was getting cut off the screen. Next, I made sure that people's credit card information was hidden, as that is sensitive data that should not be accessible to people using the dashboard. I also clarified that the transaction ID represents the generation order and updated the table sorting to reflect this instead of sorting by date.