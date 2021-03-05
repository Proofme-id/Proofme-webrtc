import Web3 from "web3";
import { ICheckedDid } from "../interfaces/checkedDid.interface";
import { ICredential } from "../interfaces/credential.interface";
import { ICredentialObject } from "../interfaces/credentialsObject.interface";
import { IProofObject } from "../interfaces/proof-object.interface";
import { IValidatedCredentials } from "../interfaces/validatedCredentials.interface";
import { claimHolderAbi } from "../smartcontracts/claimHolderAbi";

export async function validCredentialsTrustedPartiesFunc(credentialObject: ICredentialObject, web3Url: string, identifyByProviders: string[], trustedDids: string[]): Promise<IValidatedCredentials> {
    const web3 = new Web3(web3Url);
    const result = await validCredentialsFunc(credentialObject, identifyByProviders, web3Url);
    // If the "normal" check was not valid, don't check the trusted parties but return the result
    if (!result.valid) {
        console.log("return NOT valid");
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
        let invalidCredentials = [];
        for (const [currentCredentialKey, credential] of Object.entries(credentialObject.credentials)) {
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
                    console.log("get claim issuerDidContractAddress:", issuerDidContractAddress);
                    console.log("get claim did:", did);
                    claim = await getClaims(issuerDidContractAddress, did, web3);
                    console.log("got claim:", claim);
                    checkedDid.push({issuerDidContractAddress, did, claim})
                    claim = claim;
                }
                console.log("claim:", claim);
                if (claim) {
                    noTrustedClaimFound = false;
                    const claimExpirationDate = new Date(claim.expirationDate);
                    if (claimExpirationDate > new Date()) {
                        const claimAllowedCredentialKeys = claim.keys;
                        invalidKeyProviderAllowedKeys = claimAllowedCredentialKeys;
                        const providerCredentialKey = `${credential.provider}_${currentCredentialKey}`;
                        console.log("Checking key:", providerCredentialKey);
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
        console.log("trusted check validCredentialsAmount:", validCredentialsAmount);
        console.log("trusted check credentials total:", Object.entries(credentialObject.credentials).length);
        if (validCredentialsAmount === Object.entries(credentialObject.credentials).length) {
            return {
                credentials: credentialObject.credentials,
                proof: credentialObject.proof,
                valid: true,
                code: 0,
                message: "Valid credential"
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

export async function validCredentialsFunc(credentialObject: ICredentialObject, identifyByProviders: string[], web3Url: string): Promise<IValidatedCredentials> {
    // If the object is stringified
    if (typeof credentialObject === "string") {
        credentialObject = JSON.parse(credentialObject);
    }
    credentialObject = reOrderCredentialObject(credentialObject);
    const web3Node = new Web3(web3Url);
    const checkedDid: ICheckedDid[] = [];
    const credentialObjectWithoutProofSignature = JSON.parse(JSON.stringify(credentialObject));
    delete credentialObjectWithoutProofSignature.proof.signature;
    let validCredentialsAmount = 0;
    let invalidCredentials = [];
    for (const [, credential] of Object.entries(credentialObject.credentials)) {
        const foundProvider = identifyByProviders.includes(credential.provider);
        if (!foundProvider) {
            console.log(`FAILURE The application asked for providers ${identifyByProviders} but got provider ${credential.provider}`);
            invalidCredentials.push({
                credential,
                code: 9,
                message: `FAILURE The application asked for providers ${identifyByProviders} but got provider ${credential.provider}`
            })
            continue;
        }
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
        console.log("user signature object:", credentialObjectWithoutProofSignature);
        console.log("should recover:", credentialObject.proof.holder);
        const userRecoveredAddress = web3Node.eth.accounts.recover(JSON.stringify(credentialObjectWithoutProofSignature), credentialObject.proof.signature);
        console.log("did recover:", userRecoveredAddress);
        const then = new Date(credentialObject.proof.nonce);
        const minutesDifference = calculateMinutesDifference(now, then);
        if (minutesDifference <= 5) {
            const correctUserSignature = userCredentialSignatureWrong(credentialObject.proof.holder, userRecoveredAddress);
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
                        const userHolderKey = credentialObject.proof.holder;
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
                message: "QR code expired"
            });
        }
    }
    console.log("only cred validCredentialsAmount:", validCredentialsAmount);
    console.log("only cred credentials total:", Object.entries(credentialObject.credentials).length);
    if (validCredentialsAmount === Object.entries(credentialObject.credentials).length) {
        return {
            credentials: credentialObject.credentials,
            proof: credentialObject.proof,
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
            console.log("NO need to check DID contract");
            checkedDid.push({ did: didAddress, holderKey, result: true });
            return true;
        } else {
            console.log("YES need to check DID contract");
            const sha3Key = getSha3Key(holderKey, web3Node);
            const web3 = new Web3(web3Url);
            const keyManagerContract = new web3.eth.Contract(
                claimHolderAbi,
                didAddress
            );
            if (!knownAddressesContains(knownAddresses, sha3Key, didAddress)) {
                const keyPurpose = parseInt(await getKeyPurpose(keyManagerContract, sha3Key), 10);
                console.log("keyPurpose:", keyPurpose);
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
    const object: ICredentialObject = {
        credentials: {},
        proof: {
            holder: credential.proof.holder,
            nonce: credential.proof.nonce,
            type: credential.proof.type,
            signature: credential.proof.signature
        }
    } as ICredentialObject;

    const keyArray = [];
    for (const cred in credential.credentials) {
        keyArray.push(cred);
    }
    keyArray.sort();

    for (const key of keyArray) {
        object.credentials[key] = reOrderCredential(credential.credentials[key]);
    }
    return object;
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
    console.log("claimIds:", claimIds);
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
    console.log("signProofObject");
    // If the object is stringified
    if (typeof proofObject === "string") {
        proofObject = JSON.parse(proofObject);
    }
    proofObject = reOrderProofObject(proofObject);
    const web3 = new Web3();
    return web3.eth.accounts.sign(JSON.stringify(proofObject), privateKey).signature
};

function reOrderProofObject(proofObject: IProofObject): IProofObject {
    console.log("reOrderProofObject:", proofObject);
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