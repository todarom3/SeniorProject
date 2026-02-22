This is my notes for research and updates on my part of the project. 
Fraud detection comes in layers: 
A) The primary model would likely be a random forest classifier, which would act as the predictor and use ML to predict potential fraud. 
B) there is logisitc regression: which is a model that tracks specific transcations as well as info abt said transactions like time, amount, location, etc. 
C) Another model is an isolation forest: which is an unsupervised learning algorithm that can be used to flag suspicious transactions. 
Each of these will more than likely be used, as I do more research i will add it on here. 


2/15/26: began implementation of toy model, as well as creating a test folder with a file that will test the model using the transactions.csv file
- i need help installing python on my system as it is giving me problems. 

2/21/26 
- worked on toy model and installed python on my computer. Switched to VS code instead of Eclipse for IDE. Installing python changed a lot of the orignal src folder of the project to support python dependencies. 
    - Had AI help with script running as well as patching up bugs within the toy model and test model files. the trained model is saved under the 'ml' folder. 
    * one problem im running into is trying to run my model in the terminal and the commands i use are not working. I had the VS Code AI try to help me, it did so by trying to add an alias in the .zsrhc and that still did not work. 
        # the problem was resolved by executing the code in the standard Terminal, not the shortcut that VS code offers. 

    I ran the model once, and then i had the VS Code AI implement the same alias command for the testModel file. Each result is saved inside the "outputs" folder. Each time the model is ran, it will display the specific results into a separate file all inside the OUTPUTS folder. 