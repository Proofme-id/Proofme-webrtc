import Web3 from "web3";
import { ICheckedDid } from "../interfaces/checkedDid.interface";
import { ICredential } from "../interfaces/credential.interface";
import { ICredentialObject } from "../interfaces/credentialsObject.interface";
import { IProofObject } from "../interfaces/proof-object.interface";
import { IRequestedCredentials } from "../interfaces/requestedCredentials.interface";
import { IRequestedCredentialsCheckResult } from "../interfaces/requestedCredentialsCheckResult";
import { IValidatedCredentials } from "../interfaces/validatedCredentials.interface";
import { claimHolderAbi } from "../smartcontracts/claimHolderAbi";

export async function validCredentialsTrustedPartiesFunc(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[]): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult> {
    const web3 = new Web3(web3Url);
    const requestedCheckResult = requestedCredentialsCorrect(credentialObject, requestedCredentials);
    if (!requestedCheckResult.success) {
        requestedCheckResult.credentials = credentialObject;
        return requestedCheckResult;
    }
    const result = await validCredentialsFunc(credentialObject, web3Url);
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
        let invalidCredentials = [];
        for (const [provider, ] of Object.entries(credentialObject.credentials)) {
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
                        checkedDid.push({issuerDidContractAddress, did, claim})
                        claim = claim;
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

export async function validCredentialsFunc(credentialObject: ICredentialObject, web3Url: string): Promise<IValidatedCredentials> {
    // If the object is stringified
    if (typeof credentialObject === "string") {
        credentialObject = JSON.parse(credentialObject);
    }
    credentialObject = reOrderCredentialObject(credentialObject);
    const web3Node = new Web3(web3Url);
    const checkedDid: ICheckedDid[] = [];
    let validCredentialsAmount = 0;
    let credentialsAmount = 0;
    let invalidCredentials = [];
    for (const [provider, ] of Object.entries(credentialObject.credentials)) {
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
            const credentialObjectWithoutProofSignature = JSON.parse(JSON.stringify(credentialObject.credentials[provider]));
            delete credentialObjectWithoutProofSignature.proof.signature;
            const userRecoveredAddress = web3Node.eth.accounts.recover(JSON.stringify(credentialObjectWithoutProofSignature), credentialObject.credentials[provider].proof.signature);
            const then = new Date(credentialObject.credentials[provider].proof.nonce);
            const minutesDifference = calculateMinutesDifference(now, then);
            if (minutesDifference <= 5) {
                const correctUserSignature = userCredentialSignatureWrong(credentialObject.credentials[provider].proof.holder, userRecoveredAddress);
                // Check if the user (Identity App) did sign it correct
                if (correctUserSignature) {
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
                                validCredentialsAmount++;
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
                } else {
                    invalidCredentials.push({
                        credential,
                        code: 3,
                        message: "User signature incorrect"
                    });
                }
            } else {
                invalidCredentials.push({
                    credential,
                    code: 2,
                    message: "Nonce too old"
                });
            }
        }
    }
    console.log("only cred validCredentialsAmount:", validCredentialsAmount);
    console.log("only cred credentialsAmount:", credentialsAmount);
    if (validCredentialsAmount === credentialsAmount) {
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
                knownAddresses.push({sha3Key, didAddress});
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

export function calculateMinutesDifference(dt2: Date, dt1: Date): number  {
    let diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60;
    return Math.abs(Math.round(diff));
}

function reOrderCredentialObject(credential: ICredentialObject): ICredentialObject {
    // Get all provided providers
    const providersArray = [];
    for (const provider in credential) {
        providersArray.push(provider);
    }
    providersArray.sort();

    // Loop every provider
    for (const provider of providersArray) {
        const credentialKeys = [];
        // Get all credential keys
        for (const credentialKey in credential[provider].credentials) {
            credentialKeys.push(credentialKey);
        }
        credentialKeys.sort();
        // Loop the credential keys one by one and re order the credentials so its alphabetical
        for (const credentialKey of credentialKeys) {
            credential[provider].credentials[credentialKey] = reOrderCredential(credential[provider].credentials[credentialKey]);
        }
    }
    return credential;
}

function reOrderCredential(credential: ICredential): ICredential {
    return {
        credentialSubject: {
            credential: {
                type: credential.credentialSubject.credential.type,
                value: credential.credentialSubject.credential.value
            }
        },
        expirationDate: credential.expirationDate,
        id: credential.id,
        issuanceDate: credential.issuanceDate,
        issuer: {
            authorityId: credential.issuer.authorityId,
            authorityName: credential.issuer.authorityName,
            id: credential.issuer.id,
            name: credential.issuer.name
        },
        proof: {
            holder: credential.proof.holder,
            nonce: credential.proof.nonce,
            signature: credential.proof.signature,
            type: credential.proof.type
        },
        provider: credential.provider,
        type: credential.type,
        verifiedCredential: credential.verifiedCredential,
        version: credential.version
    } as ICredential
}

export function signCredential(credential: ICredential, privateKey: string) {
    // If the object is stringified
    if (typeof credential === "string") {
        credential = JSON.parse(credential);
    }
    credential = reOrderCredential(credential);
    const web3 = new Web3();
    return web3.eth.accounts.sign(JSON.stringify(credential), privateKey).signature
};

export function signCredentialObject(credential: ICredentialObject, privateKey: string) {
    // If the object is stringified
    if (typeof credential === "string") {
        credential = JSON.parse(credential);
    }
    credential = reOrderCredentialObject(credential);
    const web3 = new Web3();
    return web3.eth.accounts.sign(JSON.stringify(credential), privateKey).signature
};

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
};

function reOrderProofObject(proofObject: IProofObject): IProofObject {
    return {
        credentialSubject: {
            credential: {
                description: proofObject.credentialSubject.credential.description,
                hash: proofObject.credentialSubject.credential.hash,
                link: proofObject.credentialSubject.credential.link,
                template: proofObject.credentialSubject.credential.template,
                type: proofObject.credentialSubject.credential.description
            }
        },
        expirationDate: proofObject.expirationDate,
        id: proofObject.id,
        issuanceDate: proofObject.issuanceDate,
        proof: {
            holder: proofObject.proof.holder,
            nonce: proofObject.proof.nonce,
            signature: proofObject.proof.signature,
            type: proofObject.proof.type
        },
        type: proofObject.type,
        version: proofObject.version
    } as IProofObject
}

function requestedCredentialsCorrect(credentials: ICredentialObject, requestedCredentials: IRequestedCredentials): IRequestedCredentialsCheckResult {
    console.log("requestedCredentials:", requestedCredentials);
    console.log("credentials:", credentials);

    let checkResult: IRequestedCredentialsCheckResult = {
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
            if (!found){ 
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