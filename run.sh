#!/bin/bash

echo ""
echo "Script to auto deply or destroy the infra using aws cdk ..."
echo ""

echo "Enter your choice (small letters only) i.e."
echo "Type 'install' for installation or 'destroy' to delete."
echo ""
read -p "Type your choice: " CHOICE
echo ""

if [[ "$CHOICE" == "" ]]
then
echo "You did not enter anything. Please re run script and enter your choice."
exit
else
    if [[ "$CHOICE" == "install" ]]
    then
        echo "Performing the steps for deployment ..."
        echo ""
        echo "Performing unzip to extract code ..."
        echo ""
        unzip techsee.zip
        echo ""
        echo "Install cdk dependencies ..."
        echo ""
        npm install
        echo ""
        sudo npm install -g aws-cdk
        echo ""
        cdk bootstrap
        echo ""
        echo "Deploying the infrastructure ..."
        echo ""
        npm run deploy
        echo ""
        echo "Infrastructure deployment completed. Please perform the final steps manually ..."
    elif [[ "$CHOICE" == "destroy" ]]
    then
        echo "You have selected to delete the infrastructure."
        echo ""
        echo "This process is irreversible once started."
        echo ""
        echo "If you are sure please type 'yes' for continue or 'no' to cancel it"
        echo ""
        read -p "Type 'yes' or 'no' here: " OPTION
        echo ""
        if [[ "$OPTION" == "yes" ]]
        then
            echo "Process to delete the infra started ..."
            echo ""
            npm run destroy
            echo ""
            echo "Infra is deleted ..."
        elif [[ "$OPTION" == "no" ]]
        then
            echo "You have made the right choice. Exiting now ..."
            exit
        else
            echo "You have not entered anything so exiting ..."
            exit
        fi
    else
        echo "You did not enter the right choice. Please re check the option or spell correct ..."
        exit
    fi
fi