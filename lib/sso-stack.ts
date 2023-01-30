import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import ResourcesName from "./constants";

interface SsoStackProps extends cdk.StackProps {
    tscc_provisioning_api_url?: string;
    tscc_activation_api_url?: string;
    distributionDomainName?: string;
    bucketName?:string;
}

export class SsoStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: SsoStackProps) {
        super(scope, id, props);
        const s3PermissionsForLambda = new iam.PolicyStatement({
            actions: ["s3:ListAllMyBuckets", "s3:*Object"],
            resources: ["arn:aws:s3:::*"],
        });
        const connectPermissionsForLambda = new iam.PolicyStatement({
            actions: [
                "connect:Get*",
                "connect:Describe*",
                "connect:List*",
                "ds:DescribeDirectories",
            ],
            resources: ["*"],
        });

        const ssoPermissionsForLambda = new iam.PolicyStatement({
            actions: [
                "sso:ListAccountAssignments",
                "identitystore:ListGroupMemberships",
                "sso:ListPermissionSets",
                "sso:ListAccountsForProvisionedPermissionSet",
                "sso:ListInstances",
                "sso:DescribePermissionSet",
            ],
            resources: ["*"],
        });
        /**
         * lambda and api for techsee get admin config
         */
        const tsccSsoLambda = new lambda.Function(
            this,
            ResourcesName.SSO_LAMBDA,
            {
                functionName: ResourcesName.SSO_LAMBDA,
                handler: "index.handler",
                code: lambda.Code.fromAsset("./resources/tscc_sso_lambda.zip"),
                runtime: lambda.Runtime.NODEJS_18_X,
                timeout: cdk.Duration.seconds(6),
            }
        );

        tsccSsoLambda.addEnvironment(
            "clientLocation",
            `https://${props?.distributionDomainName}`
            // "http://localhost:3000"
        );
        tsccSsoLambda.addEnvironment("cert", "");
        tsccSsoLambda.addEnvironment("entryPoint", "");
        tsccSsoLambda.addEnvironment(
            "activationApi",
            props?.tscc_activation_api_url || ""
        );
        tsccSsoLambda.addEnvironment(
            "provisioningApi",
            props?.tscc_provisioning_api_url || ""
        );
        tsccSsoLambda.addEnvironment("bucket", props?.bucketName || "");

        // attach permissions
        tsccSsoLambda.role?.attachInlinePolicy(
            new iam.Policy(this, ResourcesName.SSO_POLICY, {
                statements: [
                    connectPermissionsForLambda,
                    ssoPermissionsForLambda,
                    s3PermissionsForLambda,
                ],
            })
        );

        // api for get admin config
        const tsccSsoConfigApi = new apiGateway.LambdaRestApi(
            this,
            ResourcesName.SSO_API,
            {
                restApiName: ResourcesName.SSO_API,
                handler: tsccSsoLambda,
                proxy: false,
                defaultCorsPreflightOptions: {
                    allowOrigins: apiGateway.Cors.ALL_ORIGINS,
                    allowMethods: apiGateway.Cors.ALL_METHODS,
                },
            }
        );
        tsccSsoConfigApi.root.addMethod("GET");
        tsccSsoConfigApi.root.addMethod("POST");
    }
}
