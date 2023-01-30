#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SaveConfigStack } from "../lib/save-config-stack";
import { WepAppStack } from "../lib/web-app-stack";
import ResourceName from "../lib/constants";
import { SsoStack } from "../lib/sso-stack";

const app = new cdk.App();
// stack 1
const saveConfigStack = new SaveConfigStack(app, ResourceName.CONFIG_STACK, {});

// stack 2
const wepAppStack = new WepAppStack(app, ResourceName.WEB_APP_STACK, {});

// stack 3
new SsoStack(app, ResourceName.SSO_STACK, {
    tscc_provisioning_api_url: saveConfigStack.tscc_provisioning_api_url,
    tscc_activation_api_url: saveConfigStack.tscc_activation_api_url,
    distributionDomainName: wepAppStack.distributionDomainName,
    bucketName: wepAppStack.Bucket
});
