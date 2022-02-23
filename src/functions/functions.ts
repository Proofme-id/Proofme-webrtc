import Web3 from "web3";
import { ICheckedDid } from "../interfaces/checkedDid.interface";
import { ICredential } from "../interfaces/credential.interface";
import { ICredentialObject } from "../interfaces/credentialsObject.interface";
import { IProofObject } from "../interfaces/proof-object.interface";
import { IProof } from "../interfaces/proof.interface";
import { IRequestedCredentials } from "../interfaces/requestedCredentials.interface";
import { IRequestedCredentialsCheckResult } from "../interfaces/requestedCredentialsCheckResult";
import { IValidatedCredentials } from "../interfaces/validatedCredentials.interface";
import { claimHolderAbi } from "../smartcontracts/claimHolderAbi";

export async function validCredentialsTrustedPartiesFunc(
    credentialObject: ICredentialObject,
    web3Url: string,
    requestedCredentials: IRequestedCredentials,
    trustedDids: string[],
    checkUserNonce: boolean,
    livenessCheckRequired?: boolean
): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult> {
    const web3 = new Web3(web3Url);
    const requestedCheckResult = requestedCredentialsCorrect(credentialObject, requestedCredentials);
    if (!requestedCheckResult.success) {
        requestedCheckResult.credentials = credentialObject;
        return requestedCheckResult;
    }
    const result = await validCredentialsFunc(credentialObject, web3Url, checkUserNonce, livenessCheckRequired);
    // If the "normal" check was not valid, don't check the trusted parties but return the result
    if (!result.valid) {
        return result;
    }
    // Check if the trusted addresses are addressed
    for (const did of trustedDids) {
        if (!web3.utils.isAddress(did)) {
            console.error(`Trusted party did ${did} is NOT a valid address and is removed.`);
            trustedDids = trustedDids.filter(x => x !== did);
        }
    }
    if (trustedDids.length > 0) {
        const checkedDid = [];
        let validCredentialsAmount = 0;
        let credentialsAmount = 0;
        const invalidCredentials = [];
        for (const [provider,] of Object.entries(credentialObject.credentials)) {
            for (const [currentCredentialKey, credential] of Object.entries(credentialObject.credentials[provider].credentials)) {
                credentialsAmount++;
                const issuerDidContractAddress = credential.issuer.id.split(":")[2];
                let foundValid = false;
                let invalidKeyProvider = null;
                let invalidKeyProviderAllowedKeys = null;
                let noTrustedClaimFound = true;
                for (const did of trustedDids) {
                    const foundEntry = checkedDid.find(x => x.issuerDidContractAddress === issuerDidContractAddress && x.did === did);
                    let claim = null;
                    if (foundEntry) {
                        claim = foundEntry.claim;
                    } else {
                        claim = await getClaims(issuerDidContractAddress, did, web3);
                        checkedDid.push({ issuerDidContractAddress, did, claim })
                    }
                    if (claim) {
                        noTrustedClaimFound = false;
                        const claimExpirationDate = new Date(claim.expirationDate);
                        if (claimExpirationDate > new Date()) {
                            const claimAllowedCredentialKeys = claim.keys;
                            invalidKeyProviderAllowedKeys = claimAllowedCredentialKeys;
                            const providerCredentialKey = `${credential.provider}_${currentCredentialKey}`;
                            if (!claimAllowedCredentialKeys.includes(providerCredentialKey)) {
                                invalidKeyProvider = providerCredentialKey;
                                console.log(`Provider ${did} was not allowed to issue key ${providerCredentialKey}. Skipping this one`)
                                break;
                            }
                            if (!invalidKeyProvider) {
                                validCredentialsAmount++;
                                foundValid = true;
                                break;
                            }
                        } else {
                            invalidCredentials.push({
                                credential,
                                valid: false,
                                code: 14,
                                message: "Claim expired."
                            });
                        }
                    }
                }
                if (noTrustedClaimFound) {
                    invalidCredentials.push({
                        credential,
                        valid: false,
                        code: 13,
                        message: `No claims found to check. Checked dids ${trustedDids}`
                    });
                    continue;
                }
                if (invalidKeyProvider && !foundValid) {
                    invalidCredentials.push({
                        credential,
                        valid: false,
                        code: 12,
                        message: `Tried to validate attribute ${invalidKeyProvider} but provider was not allowed to issue. Allowed attributes: ${invalidKeyProviderAllowedKeys.join(", ")}`
                    });
                    continue;
                }
            }
        }
        console.log("trusted check validCredentialsAmount:", validCredentialsAmount);
        console.log("trusted check credentialsAmount:", credentialsAmount);
        if (validCredentialsAmount === credentialsAmount) {
            return {
                credentials: credentialObject.credentials as any,
                valid: true,
                code: 0,
                message: "Valid credential",
                requestedCheckResult
            }
        } else {
            return {
                valid: false,
                code: 1,
                message: "Invalid credentials",
                invalidCredentials
            }
        }
    } else {
        return {
            valid: false,
            code: 10,
            message: "No trusted parties to check."
        }
    }

}

export async function validCredentialsFunc(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials> {
    // If the object is stringified
    if (typeof credentialObject === "string") {
        credentialObject = JSON.parse(credentialObject);
    }
    credentialObject = reOrderCredentialObject(credentialObject);
    const web3Node = new Web3(web3Url);
    const checkedDid: ICheckedDid[] = [];
    let validCredentialsAmount = 0;
    let credentialsAmount = 0;
    const invalidCredentials = [];
    for (const [provider,] of Object.entries(credentialObject.credentials)) {
        // Check the user credentials (for each provider): Reconstruct it so we only have the credentialObject of 
        // that specific provider (which we generated the signature over)
        const credentialObjectWithoutProofSignature: ICredentialObject = {
            credentials: {
                [provider]: JSON.parse(JSON.stringify(credentialObject.credentials[provider]))
            }
        }
        delete credentialObjectWithoutProofSignature.credentials[provider].proof.signature;
        const userRecoveredAddress = web3Node.eth.accounts.recover(JSON.stringify(credentialObjectWithoutProofSignature), credentialObject.credentials[provider].proof.signature);
        const correctUserSignature = userCredentialSignatureWrong(credentialObject.credentials[provider].proof.holder, userRecoveredAddress);
        // Check if the user (Identity App) did sign it correct; otherwhise skip this provider
        if (correctUserSignature) {
            for (const [, credential] of Object.entries(credentialObject.credentials[provider].credentials)) {
                credentialsAmount++;
                if (!credential.version) {
                    invalidCredentials.push({
                        credential,
                        code: 8,
                        message: "Incorrect credential version. Renew your credentials"
                    });
                    continue;
                }
                const credentialExpirationDate = new Date(credential.expirationDate);
                const now = new Date();
                if (now > credentialExpirationDate) {
                    invalidCredentials.push({
                        credential,
                        code: 7,
                        message: `Your credential expired on ${credentialExpirationDate}`
                    });
                    continue;
                }
                const then = new Date(credentialObject.credentials[provider].proof.nonce);
                const minutesDifference = calculateMinutesDifference(now, then);
                if (minutesDifference > 5 && checkUserNonce) {
                    invalidCredentials.push({
                        credential,
                        code: 2,
                        message: "Nonce too old"
                    });
                    continue;
                }
                // Check if the sent credentials were provided by the did of the credential (check the signature of each credential)
                const correctIssuerSignature = issuerCredentialSignatureWrong(credential, web3Node);
                if (correctIssuerSignature) {
                    // Check every credential DID contract if the holder belongs to that DID
                    const issuerHolderKey = credential.proof.holder;
                    const issuerDidContractAddress = credential.issuer.id.split(":")[2];
                    const issuerCorrectDid = await didContractKeyWrong(web3Node, web3Url, claimHolderAbi, issuerHolderKey, issuerDidContractAddress, checkedDid);
                    if (issuerCorrectDid) {
                        const userHolderKey = credentialObject.credentials[provider].proof.holder;
                        const userDidContractAddress = credential.id.split(":")[2];
                        const userCorrectDid = await didContractKeyWrong(web3Node, web3Url, claimHolderAbi, userHolderKey, userDidContractAddress, checkedDid);
                        if (userCorrectDid) {
                            if (!livenessCheckRequired || (credential.verified === undefined || credential.verified === true)) {
                                validCredentialsAmount++;
                            } else {
                                invalidCredentials.push({
                                    credential,
                                    code: 15,
                                    message: "Liveness check required but credential not verified"
                                });
                            }
                        } else {
                            invalidCredentials.push({
                                credential,
                                code: 6,
                                message: "User did incorrect"
                            });
                        }
                    } else {
                        invalidCredentials.push({
                            credential,
                            code: 5,
                            message: "Issuer did incorrect"
                        });
                    }
                } else {
                    invalidCredentials.push({
                        credential,
                        code: 4,
                        message: "Issuer signature incorrect"
                    });
                }
            }

        } else {
            invalidCredentials.push({
                credential: credentialObject.credentials[provider],
                code: 3,
                message: "User signature incorrect"
            });
        }
    }
    console.log("only cred validCredentialsAmount:", validCredentialsAmount);
    console.log("only cred credentialsAmount:", credentialsAmount);
    // When the user signature is incorrect we don't validate any more when there is 1 provider so credentialsamount should be more than 0
    if (credentialsAmount > 0 && validCredentialsAmount === credentialsAmount) {
        return {
            credentials: credentialObject.credentials as any,
            valid: true,
            code: 0,
            message: "Valid credential"
        }
    } else {
        return {
            valid: false,
            code: 1,
            message: "Invalid credential",
            invalidCredentials
        }
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function userCredentialSignatureWrong(holderKey: any, recoveredAddress: string) {
    if (holderKey !== recoveredAddress) {
        console.error(`User signature of credential ${holderKey} does not match recoveredAddress ${recoveredAddress}`);
        return false;
    }
    return true;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function issuerCredentialSignatureWrong(credential: any, web3Node: any) {
    const issuerSignature = credential.proof.signature;
    const credentialIssuerKey = credential.proof.holder;
    const credentialWithoutIssuerProof = JSON.parse(JSON.stringify(credential));
    delete credentialWithoutIssuerProof.proof.signature;
    const recoveredAddress = web3Node.eth.accounts.recover(JSON.stringify(credentialWithoutIssuerProof), issuerSignature);
    if (credentialIssuerKey !== recoveredAddress) {
        console.error(`Issuer signature of credential ${credentialIssuerKey} does not match recoveredAddress ${recoveredAddress}`);
        return false;
    }
    return true;
}

export async function didContractKeyWrong(web3Node: any, web3Url: string, claimHolderAbi: any, holderKey: string, didAddress: string, checkedDid: ICheckedDid[]): Promise<boolean> {
    const foundEntry = checkedDid.find(x => x.did == didAddress && x.holderKey === holderKey);
    if (foundEntry) {
        return foundEntry.result;
    } else {
        const knownAddresses = [];

        if (didAddress === holderKey) {
            checkedDid.push({ did: didAddress, holderKey, result: true });
            return true;
        } else {
            const sha3Key = getSha3Key(holderKey, web3Node);
            const web3 = new Web3(web3Url);
            const keyManagerContract = new web3.eth.Contract(
                claimHolderAbi,
                didAddress
            );
            if (!knownAddressesContains(knownAddresses, sha3Key, didAddress)) {
                const keyPurpose = parseInt(await getKeyPurpose(keyManagerContract, sha3Key), 10);
                // keyPurpose 1 = Owner
                // keyPurpose 2 = Action Key
                // keyPurpose 3 = Claim Signer Key 
                // keyPurpose 4 = Encryption key
                if (keyPurpose === 0 || keyPurpose > 3) {
                    checkedDid.push({ did: didAddress, holderKey, result: false });
                    return false;
                }
                knownAddresses.push({ sha3Key, didAddress });
            }
            checkedDid.push({ did: didAddress, holderKey, result: true });
            return true;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function knownAddressesContains(list: any[], sha3Key: string, didContractAddress: string) {
    for (const listItem of list) {
        if (listItem.sha3Key === sha3Key && listItem.didContractAddress === didContractAddress) {
            return true;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getSha3Key(key: string, web3Node: any) {
    return web3Node.utils.keccak256(key);
}

export async function getKeyPurpose(keyManagerContract: any, key: string): Promise<string> {
    // Get Events
    if (keyManagerContract.options.address === null) {
        return Promise.resolve("-1");
    } else {
        return await keyManagerContract.methods.getKeyPurpose(key).call();
    }
}

export function calculateMinutesDifference(dt2: Date, dt1: Date): number {
    let diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60;
    return Math.abs(Math.round(diff));
}

function reOrderCredentialObject(credentialObject: ICredentialObject): ICredentialObject {
    // Loop every provider
    for (const provider of Object.keys(credentialObject.credentials)) {
        const credentialKeys = [];
        // Get all credential keys
        for (const credentialKey of Object.keys(credentialObject.credentials[provider].credentials)) {
            credentialKeys.push(credentialKey);
        }
        credentialKeys.sort();
        const reOrderedCredentials = {};
        // Loop the credential keys one by one and re order the credentials so its alphabetical
        for (const credentialKey of credentialKeys) {
            const reOrderedCredential = reOrderCredential(credentialObject.credentials[provider].credentials[credentialKey]);
            reOrderedCredentials[credentialKey] = reOrderedCredential;
        }
        credentialObject.credentials[provider].proof = reOrderCredentialProof(credentialObject.credentials[provider].proof);
        credentialObject.credentials[provider] = {
            credentials: reOrderedCredentials,
            proof: credentialObject.credentials[provider].proof
        }
    }
    return credentialObject;
}

function reOrderCredential(credential: ICredential): ICredential {
    return sortObjectAlphabetically(credential);
}

export function sortObjectAlphabetically(object: any): any {
    const sortedObj = {};
    const keys = Object.keys(object);

    keys.sort((key1, key2) => {
        key1 = key1.toLowerCase();
        key2 = key2.toLowerCase();
        if (key1 < key2) {
            return -1;
        }
        if (key1 > key2) {
            return 1;
        }
        // If it's the same
        return 0;
    });

    for (const index in keys) {
        const key = keys[index];
        // If we have nested objects, we need to dig deeper
        if (typeof object[key] == "object" && !(object[key] instanceof Array)) {
            sortedObj[key] = sortObjectAlphabetically(object[key]);
        } else {
            sortedObj[key] = object[key];
        }
    }

    return sortedObj;
}

export function reOrderCredentialProof(proof: IProof): IProof {
    return {
        holder: proof.holder,
        nonce: proof.nonce,
        signature: proof.signature,
        type: proof.type
    };
}

export function signCredential(credential: ICredential, privateKey: string) {
    // If the object is stringified
    if (typeof credential === "string") {
        credential = JSON.parse(credential);
    }
    credential = reOrderCredential(credential);
    const web3 = new Web3();
    return web3.eth.accounts.sign(JSON.stringify(credential), privateKey).signature
}

export function signCredentialObject(credentialObject: ICredentialObject, privateKey: string) {
    // If the object is stringified
    if (typeof credentialObject === "string") {
        credentialObject = JSON.parse(credentialObject);
    }
    credentialObject = reOrderCredentialObject(credentialObject);
    const web3 = new Web3();
    return web3.eth.accounts.sign(JSON.stringify(credentialObject), privateKey).signature
}

export async function getClaims(claimType: number | string, contractAddress: string, web3: Web3): Promise<any> {
    const contract = new web3.eth.Contract(claimHolderAbi, contractAddress);
    const claimIds = await contract.methods.getClaimIdsByType(claimType).call();
    if (claimIds.length > 0) {
        try {
            // Get all raw claims
            const rawClaims = await contract.methods.getClaim(claimIds[claimIds.length - 1]).call();
            // Parse the data
            const parsedClaims = JSON.parse(web3.utils.toAscii(rawClaims.data));
            return Promise.resolve(parsedClaims);
        } catch (error) {
            return Promise.resolve(null);
        }
    } else {
        return Promise.resolve(null);
    }
}

export function signProofObject(proofObject: IProofObject, privateKey: string) {
    // If the object is stringified
    if (typeof proofObject === "string") {
        proofObject = JSON.parse(proofObject);
    }
    proofObject = reOrderProofObject(proofObject);
    const web3 = new Web3();
    return web3.eth.accounts.sign(JSON.stringify(proofObject), privateKey).signature
}

export function reOrderProofObject(proofObject: IProofObject): IProofObject {
    return sortObjectAlphabetically(proofObject);
}

function requestedCredentialsCorrect(credentials: ICredentialObject, requestedCredentials: IRequestedCredentials): IRequestedCredentialsCheckResult {
    const checkResult: IRequestedCredentialsCheckResult = {
        success: true,
        missingKeys: []
    }
    // Loop all requested credentials
    for (const requestedCredential of requestedCredentials.credentials) {
        let isInsideMinimumRequired = false;
        if (requestedCredentials.minimumRequired) {
            isInsideMinimumRequired = !!requestedCredentials.minimumRequired.data.find(x => x === requestedCredential.key);
        }
        // Check only required keys
        if (requestedCredential.required && !isInsideMinimumRequired) {
            if (!Array.isArray(requestedCredential.provider)) {
                requestedCredential.provider = [requestedCredential.provider];
            }
            let found = false;
            for (const provider of requestedCredential.provider) {
                if (credentials.credentials[provider] &&
                    credentials.credentials[provider].credentials &&
                    credentials.credentials[provider].credentials[requestedCredential.key]
                ) {
                    // All good, found!
                    found = true;
                }
            }
            if (!found) {
                checkResult.success = false;
                checkResult.missingKeys.push(requestedCredential);
            }
        }
    }
    // Check if the minimum required amount has been reached
    if (requestedCredentials.minimumRequired) {
        const providers = Object.keys(credentials.credentials);
        const credentialKeys = requestedCredentials.minimumRequired.data;
        let foundCredentials = 0;
        for (const provider of providers) {
            for (const credentialKey of credentialKeys) {
                if (credentials.credentials[provider] &&
                    credentials.credentials[provider].credentials &&
                    credentials.credentials[provider].credentials[credentialKey]
                ) {
                    // All good, found!
                    foundCredentials++;
                }
            }
        }
        if (foundCredentials < requestedCredentials.minimumRequired.amount) {
            checkResult.success = false;
            checkResult.missingMessage = `Check the minimumRequired array. Found ${foundCredentials} items and required amount ${requestedCredentials.minimumRequired.amount}`
        }
    }
    return checkResult;
}