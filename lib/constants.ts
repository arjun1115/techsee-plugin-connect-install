const ResourceName = {
    SSO_APPLICATION: "tscc-sso-application",
    BUCKET: `tscc-web-app-bucket-${new Date().getTime()}`,
    WEB_APP: "tscc-web-app",
    CLOUDFRONT: "tscc-cf-distribution",
    SSO_LAMBDA: "tscc-sso-lambda",
    SSO_API: "tscc-sso-api",
    PROVISIONING_LAMBDA: "tscc-provisioing-lambda",
    PROVISIONING_API: "tscc-provisioing-api",
    ACTIVATION_LAMBDA: "tscc-activation-lambda",
    ACTIVATION_API: "tscc-activation-api",
    S3_PROVISIONING_POLICY: "tscc-s3-provisioning-policy",
    S3_ACTIVATION_POLICY: "tscc-s3-activation-policy",
    SSO_POLICY: "tscc-sso-policy",
    WEB_APP_STACK: "tscc-web-app-stack-1",
    CONFIG_STACK: "tscc-config-stack",
    SSO_STACK: "tscc-sso-stack",
};

export default ResourceName;
