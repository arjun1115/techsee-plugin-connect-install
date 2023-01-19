#!/bin/bash

echo ""
echo "Script to autodeply infra using aws cdk"
echo ""

read -p "Enter bucket name where code is stored: " BUCKETNAME
echo ""

if [[ "$BUCKETNAME" == "" ]]
then
echo "You forgot to enter bucket name"
exit
else
    BUCKETCHECK=$(aws s3 ls | awk '{print $3}' | grep $BUCKETNAME)
    if [[ "$BUCKETCHECK" == "$BUCKETNAME" ]]
    then
        echo "Bucket exists. Now performing the steps for deployment ..."
        aws s3 cp s3://$BUCKETNAME/techsee.zip .
        unzip techsee.zip
        cd techsee
        npm install
        sudo npm install -g aws-cdk
        cdk bootstrap
        npm run deploy
    else
        echo "Bucket does not exist. Please re check."
        exit
    fi
fi