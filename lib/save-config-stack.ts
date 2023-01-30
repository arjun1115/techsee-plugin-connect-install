import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import ResourcesName from "./constants";

export class SaveConfigStack extends cdk.Stack {
    tscc_activation_api_url: string;
    tscc_provisioning_api_url: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        /*
            Permissions
        */
        const s3PermissionsForLambda = new iam.PolicyStatement({
            actions: ["s3:ListAllMyBuckets", "s3:*Object"],
            resources: ["arn:aws:s3:::*"],
        });

        ///////////////////////////////////////////////////////////////////////////////

        /*
            lambda and api for techsee activation
        */
        const tscc_activation_lambda = new lambda.Function(
            this,
            ResourcesName.ACTIVATION_LAMBDA,
            {
                functionName: ResourcesName.ACTIVATION_LAMBDA,
                handler: "index.handler",
                code: lambda.Code.fromAsset(
                    "./resources/tscc_activation_lambda"
                ),
                runtime: lambda.Runtime.NODEJS_16_X,
            }
        );

        tscc_activation_lambda.addEnvironment("bucket", ResourcesName.BUCKET);

        tscc_activation_lambda.role?.attachInlinePolicy(
            new iam.Policy(this, ResourcesName.S3_ACTIVATION_POLICY, {
                statements: [s3PermissionsForLambda],
            })
        );

        const tscc_activation_api = new apiGateway.LambdaRestApi(
            this,
            ResourcesName.ACTIVATION_API,
            {
                restApiName: ResourcesName.ACTIVATION_API,
                handler: tscc_activation_lambda,
                proxy: false,
                defaultCorsPreflightOptions: {
                    allowOrigins: apiGateway.Cors.ALL_ORIGINS,
                    allowMethods: apiGateway.Cors.ALL_METHODS,
                },
            }
        );

        tscc_activation_api.root.addMethod("GET");
        tscc_activation_api.root.addMethod("POST");

        // this.tscc_activation_api_url = tscc_activation_api.url;

        /////////////////////////////////////////////////////////////////////////////

        /*
            lambda and api for techsee provisioning
        */
        const tscc_povisioning_lambda = new lambda.Function(
            this,
            ResourcesName.PROVISIONING_LAMBDA,
            {
                functionName: ResourcesName.PROVISIONING_LAMBDA,
                handler: "index.handler",
                code: lambda.Code.fromAsset(
                    "./resources/tscc_povisioning_lambda"
                ),
                runtime: lambda.Runtime.NODEJS_16_X,
            }
        );

        tscc_povisioning_lambda.addEnvironment("bucket", ResourcesName.BUCKET);

        tscc_povisioning_lambda.role?.attachInlinePolicy(
            new iam.Policy(this, ResourcesName.S3_PROVISIONING_POLICY, {
                statements: [s3PermissionsForLambda],
            })
        );

        const tscc_povisioning_api = new apiGateway.LambdaRestApi(
            this,
            ResourcesName.PROVISIONING_API,
            {
                restApiName: ResourcesName.PROVISIONING_API,
                handler: tscc_povisioning_lambda,
                proxy: false,
                defaultCorsPreflightOptions: {
                    allowOrigins: apiGateway.Cors.ALL_ORIGINS,
                    allowMethods: apiGateway.Cors.ALL_METHODS,
                },
            }
        );

        tscc_povisioning_api.root.addMethod("GET");
        tscc_povisioning_api.root.addMethod("POST");

        this.tscc_activation_api_url = tscc_activation_api.url;
        this.tscc_provisioning_api_url = tscc_povisioning_api.url;
        // this.tscc_provisioning_api_url = tscc_povisioning_api.url;
        new cdk.CfnOutput(this, "provisioiningApiUrl", {
            value: "tscc_activation_api.url",
            exportName: "testExport",
        });
        ///////////////////////////////////////////////////////////////////////////////
    }
}
