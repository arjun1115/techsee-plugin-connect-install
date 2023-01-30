import { SAML } from "@node-saml/node-saml";
import * as amazonConnect from "@aws-sdk/client-connect";
import * as ssoAdmin from "@aws-sdk/client-sso-admin";
import * as identityStore from "@aws-sdk/client-identitystore";
import * as s3 from "@aws-sdk/client-s3";

const allowedUsers = [
    "AdministratorAccess",
    "PowerUserAccess",
    "SystemAdministrator",
];

const { entryPoint, clientLocation, cert, activationApi, provisioningApi } =
    process.env;
const region = process.env.AWS_REGION || "eu-central-1";
const issuer = "techsee-cloud-connect";

const decodedCert = cert
    .replaceAll(" ", "\r\n")
    .replace("BEGIN\r\nCERTIFICATE", "BEGIN CERTIFICATE")
    .replace("END\r\nCERTIFICATE", "END CERTIFICATE");

const connectClient = new amazonConnect.Connect({ region });
const ssoAdminClient = new ssoAdmin.SSOAdmin({ region });
const identitystoreClient = new identityStore.IdentitystoreClient({ region });
const s3Client = new s3.S3Client({ region });

export const handler = async (event, context) => {
    try {
        const { domainName, path } = event.requestContext;
        const callbackUrl = `https://${domainName || ""}${path || ""}`;
        if (event.httpMethod === "GET") {
            const saml = new SAML({
                callbackUrl,
                cert: decodedCert,
                issuer,
                entryPoint,
            });
            const samlUrl = await saml.getAuthorizeUrlAsync();
            return buildResponse(samlUrl);
        } else if (event.httpMethod === "POST") {
            const saml = new SAML({
                // callbackUrl,
                cert: decodedCert,
                issuer,
                entryPoint,
            });
            await saveDataToS3({
                ssoApi: callbackUrl,
                provisioningApi,
                activationApi,
            });
            const SAMLResponse = event.body
                .split("SAMLResponse=")[1]
                .split("&RelayState")[0]
                .replaceAll("%2B", "+");
            const data = await saml.validatePostResponseAsync({ SAMLResponse });
            const { firstName, lastName, email, externalUserName, userID } =
                data.profile;
            const isAdmin = await checkAdmin(userID);
            if (!isAdmin) {
                return {
                    statusCode: 400,
                };
            }
            const connectInstances = await getConnectInstances();
            const instancesData = JSON.stringify(connectInstances);
            const userData = JSON.stringify({
                firstName,
                lastName,
                email,
                externalUserName,
                ssoApi: callbackUrl,
                provisioningApi,
                activationApi,
            });
            const encryptUser = encodeURI(userData);
            const response = buildResponse(
                `${clientLocation}/?user=${encryptUser}&connectInstances=${instancesData}`
            );
            console.log({ response });
            return response;
        }
    } catch (e) {
        console.log(e);
        return {
            statusCode: 500,
        };
    }
};

const saveDataToS3 = async (data) => {
    const jsonData = JSON.stringify(data);
    const buf = Buffer.from(jsonData);

    const bucketData = {
        Bucket: process.env.bucket || "tscc-frontend",
        Key: "config.json",
        Body: buf,
        ContentEncoding: "utf-8",
        ContentType: "application/json",
        // ACL: 'public-read'
    };
    const command = new s3.UploadPartCommand(bucketData);
    const res = await s3Client.send(command);
    return res;
};

const getConnectInstances = async () => {
    const command = new amazonConnect.ListInstancesCommand({ NextToken: "" });
    const data = await connectClient.send(command);
    const connectInstances = data?.InstanceSummaryList?.map((instance) => ({
        name: instance.Id,
        value: instance.Id,
        instanceAlias: instance.InstanceAlias,
    }));
    return connectInstances;
};

// check user
const getSsoInstances = async () => {
    const command = new ssoAdmin.ListInstancesCommand({ MaxResults: 10 });
    const data = await ssoAdminClient.send(command);
    return data.Instances;
};

const getPermissionSets = async (InstanceArn) => {
    const command = new ssoAdmin.ListPermissionSetsCommand({ InstanceArn });
    const data = await ssoAdminClient.send(command);
    return data.PermissionSets;
};

const describePermissionSet = async (InstanceArn, PermissionSetArn) => {
    const command = new ssoAdmin.DescribePermissionSetCommand({
        InstanceArn,
        PermissionSetArn,
    });
    const data = await ssoAdminClient.send(command);
    return data.PermissionSet;
};

const listAccountsForProvisionedPermissionSet = async (
    InstanceArn,
    PermissionSetArn
) => {
    const command = new ssoAdmin.ListAccountsForProvisionedPermissionSetCommand(
        { InstanceArn, PermissionSetArn }
    );
    const data = await ssoAdminClient.send(command);
    return data.AccountIds;
};

const listAccountAssignments = async (
    AccountId,
    InstanceArn,
    PermissionSetArn
) => {
    const command = new ssoAdmin.ListAccountAssignmentsCommand({
        AccountId,
        InstanceArn,
        PermissionSetArn,
    });
    const data = await ssoAdminClient.send(command);
    return data.AccountAssignments;
};

const listGroupMemberships = async (GroupId, IdentityStoreId) => {
    const command = new identityStore.ListGroupMembershipsCommand({
        GroupId,
        IdentityStoreId,
    });
    const data = await identitystoreClient.send(command);
    return data.GroupMemberships;
};

const checkAdmin = (userId) => {
    return new Promise(async (res, rej) => {
        try {
            const instancesData = await getSsoInstances();
            for (let i = 0; i < instancesData.length; i++) {
                const instance = instancesData[i];
                const InstanceArn = instance.InstanceArn;
                const IdentityStoreId = instance.IdentityStoreId;

                const permissionsData = await getPermissionSets(InstanceArn);

                for (let j = 0; j < permissionsData.length; j++) {
                    const PermissionSetArn = permissionsData[j];

                    const permissionSetInfo = await describePermissionSet(
                        InstanceArn,
                        PermissionSetArn
                    );

                    if (allowedUsers.includes(permissionSetInfo.Name)) {
                        const accountIds =
                            await listAccountsForProvisionedPermissionSet(
                                InstanceArn,
                                PermissionSetArn
                            );

                        for (let k = 0; k < accountIds.length; k++) {
                            const AccountId = accountIds[k];

                            const assignments = await listAccountAssignments(
                                AccountId,
                                InstanceArn,
                                PermissionSetArn
                            );

                            for (let l = 0; l < assignments.length; l++) {
                                const assignment = assignments[l];
                                if (assignment.PrincipalId === userId) {
                                    return res(true);
                                }
                                if (assignment.PrincipalType === "GROUP") {
                                    const users = await listGroupMemberships(
                                        assignment.PrincipalId,
                                        IdentityStoreId
                                    );
                                    const foundIndex = users.findIndex(
                                        (user) =>
                                            user.MemberId?.UserId === userId
                                    );
                                    if (foundIndex !== -1) return res(true);
                                }
                            }
                            return res(false);
                        }
                    }
                }
            }
        } catch (err) {
            console.log(err);
            rej(err.message);
        }
    });
};

function buildResponse(Location) {
    return {
        statusCode: 302,
        headers: {
            Location,
        },
    };
}
