import Web3 from "web3";
import { EClaimType } from "./enums/claimTypes.enum";
import { EDIDAccessLevel } from "./enums/didAccessLevel.enum";
import { ESignatureTypes } from "./enums/signatureTypes.enum";
import { IAdditionalInfo } from "./interfaces/additional-info.interface";
import { IChallenge } from "./interfaces/challenge.interface";
import { ICheckedDid } from "./interfaces/checkedDid.interface";
import { ISignedContent } from "./interfaces/claims/signedContent.interface";
import { ICredential } from "./interfaces/credential.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { IProof } from "./interfaces/proof.interface";
import { IRequestedCredentialKey } from "./interfaces/requestedCredentialKey.interface";
import { IRequestedCredentials } from "./interfaces/requestedCredentials.interface";
import { IRequestedCredentialsCheckResult } from "./interfaces/requestedCredentialsCheckResult";
import { IValidatedCredentials } from "./interfaces/validatedCredentials.interface";
import { claimHolderAbi } from "./smartcontracts/claimHolderAbi";

export class ProofmeUtils {

    excludedCredentialProviders = ["OWN", "ADDITIONAL_INFO", "SIGNATURE"];

    async isValidCredentials(
        credentialObject: ICredentialObject,
        web3Url: string,
        requestedCredentials: IRequestedCredentials,
        trustedDids: string[],
        checkUserNonce: boolean,
        livenessCheckRequired?: boolean
    ): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult> {
        const web3 = new Web3(web3Url);
        
        const requestedCheckResult = this.requestedCredentialsCorrect(credentialObject, requestedCredentials);
        if (!requestedCheckResult.success) {
            requestedCheckResult.credentials = credentialObject;
            return requestedCheckResult;
        }
        const result = await this.checkCredentials(credentialObject, web3Url, checkUserNonce, livenessCheckRequired);
        // If the "normal" check was not valid, don't check the trusted parties but return the result
        if (!result.valid) {
            return result;
        }
        // Check if the trusted addresses are addresses
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
                // We don't check own provided credentials
                if (this.excludedCredentialProviders.includes(provider)) {
                    continue;
                }
                for (const [currentCredentialKey, credential] of Object.entries(credentialObject.credentials[provider].credentials)) {
                    credentialsAmount++;
                    const issuerDidContractAddress = (credential as ICredential).issuer.id.split(":")[2];
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
                            claim = await this.getClaims(issuerDidContractAddress, did, web3);
                            checkedDid.push({ issuerDidContractAddress, did, claim })
                        }
                        if (claim) {
                            noTrustedClaimFound = false;
                            const claimExpirationDate = new Date(claim.expirationDate);
                            if (claimExpirationDate > new Date()) {
                                const claimAllowedCredentialKeys = claim.keys;
                                invalidKeyProviderAllowedKeys = claimAllowedCredentialKeys;
                                const providerCredentialKey = `${(credential as ICredential).provider}_${currentCredentialKey}`;
                                if (!claimAllowedCredentialKeys.includes(providerCredentialKey)) {
                                    invalidKeyProvider = providerCredentialKey;
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

    async checkCredentials(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials> {
        // If the object is stringified
        if (typeof credentialObject === "string") {
            credentialObject = JSON.parse(credentialObject);
        }
        credentialObject = this.reOrderCredentialObject(credentialObject);
        const web3Node = new Web3(web3Url);
        const checkedDid: ICheckedDid[] = [];
        let validCredentialsAmount = 0;
        let credentialsAmount = 0;
        const invalidCredentials = [];
        for (const [provider,] of Object.entries(credentialObject.credentials)) {
            // We don't check OWN providers
            if (this.excludedCredentialProviders.includes(provider)) {
                continue;
            }
            // Check the user credentials (for each provider): Reconstruct it so we only have the credentialObject of 
            // that specific provider (which we generated the signature over)
            const credentialObjectWithoutProofSignature: ICredentialObject = {
                credentials: {
                    [provider]: JSON.parse(JSON.stringify(credentialObject.credentials[provider]))
                }
            }
            delete credentialObjectWithoutProofSignature.credentials[provider].proof.signature;
            const userRecoveredAddress = web3Node.eth.accounts.recover(JSON.stringify(credentialObjectWithoutProofSignature), credentialObject.credentials[provider].proof.signature);
            const correctUserSignature = this.userCredentialSignatureWrong(credentialObject.credentials[provider].proof.holder, userRecoveredAddress);
            // Check if the user (Identity App) did sign it correct; otherwhise skip this provider
            if (correctUserSignature) {
                for (const [, credential] of Object.entries(credentialObject.credentials[provider].credentials)) {
                    credentialsAmount++;
                    if (!(credential as ICredential).version) {
                        invalidCredentials.push({
                            credential,
                            code: 8,
                            message: "Incorrect credential version. Renew your credentials"
                        });
                        continue;
                    }
                    const credentialExpirationDate = new Date((credential as ICredential).expirationDate);
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
                    const minutesDifference = this.calculateMinutesDifference(now, then);
                    if (minutesDifference > 5 && checkUserNonce) {
                        invalidCredentials.push({
                            credential,
                            code: 2,
                            message: "Nonce too old"
                        });
                        continue;
                    }
                    // Check if the sent credentials were provided by the did of the credential (check the signature of each credential)
                    const correctIssuerSignature = this.issuerCredentialSignatureWrong(credential as ICredential, web3Node);
                    if (correctIssuerSignature) {
                        // Check every credential DID contract if the holder belongs to that DID
                        const issuerHolderKey = (credential as ICredential).proof.holder;
                        const issuerDidContractAddress = (credential as ICredential).issuer.id.split(":")[2];
                        const issuerCorrectDid = await this.correctDidContractKey(web3Node, web3Url, claimHolderAbi, issuerHolderKey, issuerDidContractAddress, checkedDid);
                        if (issuerCorrectDid) {
                            const userHolderKey = credentialObject.credentials[provider].proof.holder;
                            const userDidContractAddress = (credential as ICredential).id.split(":")[2];
                            const userCorrectDid = await this.correctDidContractKey(web3Node, web3Url, claimHolderAbi, userHolderKey, userDidContractAddress, checkedDid);
                            if (userCorrectDid) {
                                if (!livenessCheckRequired || ((credential as ICredential).verified === undefined || (credential as ICredential).verified === true)) {
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

    userCredentialSignatureWrong(holderKey: string, recoveredAddress: string) {
        if (holderKey !== recoveredAddress) {
            console.error(`User signature of credential ${holderKey} does not match recoveredAddress ${recoveredAddress}`);
            return false;
        }
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    issuerCredentialSignatureWrong(credential: ICredential, web3Node: Web3) {
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

    async correctDidContractKey(web3Node: Web3, web3Url: string, claimHolderAbi: any, holderKey: string, didAddress: string, checkedDid: ICheckedDid[]): Promise<boolean> {
        const foundEntry = checkedDid.find(x => x.did == didAddress && x.holderKey === holderKey);
        if (foundEntry) {
            return foundEntry.result;
        } else {
            const knownAddresses = [];

            if (didAddress === holderKey) {
                checkedDid.push({ did: didAddress, holderKey, result: true });
                return true;
            } else {
                const sha3Key = this.getSha3Key(holderKey, web3Node);
                const web3 = new Web3(web3Url);
                const keyManagerContract = new web3.eth.Contract(
                    claimHolderAbi,
                    didAddress
                );
                if (!this.knownAddressesContains(knownAddresses, sha3Key, didAddress)) {
                    const keyPurpose = parseInt(await this.getKeyPurpose(keyManagerContract, sha3Key), 10);
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

    knownAddressesContains(list: any[], sha3Key: string, didContractAddress: string) {
        for (const listItem of list) {
            if (listItem.sha3Key === sha3Key && listItem.didContractAddress === didContractAddress) {
                return true;
            }
        }
    }

    getSha3Key(key: string, web3: Web3) {
        return web3.utils.keccak256(key);
    }

    async getKeyPurpose(keyManagerContract: any, key: string): Promise<EDIDAccessLevel> {
        // Get Events
        if (keyManagerContract.options.address === null) {
            return Promise.resolve(null);
        } else {
            return await keyManagerContract.methods.getKeyPurpose(key).call();
        }
    }

    calculateMinutesDifference(dt2: Date, dt1: Date): number {
        let diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60;
        return Math.abs(Math.round(diff));
    }

    reOrderCredentialObject(credentialObject: ICredentialObject): ICredentialObject {
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
                const reOrderedCredential = this.reOrderCredential(credentialObject.credentials[provider].credentials[credentialKey] as ICredential);
                reOrderedCredentials[credentialKey] = reOrderedCredential;
            }
            credentialObject.credentials[provider].proof = this.reOrderCredentialProof(credentialObject.credentials[provider].proof);
            credentialObject.credentials[provider] = {
                credentials: reOrderedCredentials,
                proof: credentialObject.credentials[provider].proof
            }
        }
        return credentialObject;
    }

    reOrderCredential(credential: ICredential): ICredential {
        return this.sortObjectAlphabetically(credential);
    }

    sortObjectAlphabetically(object: any): any {
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
            if (object[key] !== null && typeof object[key] == "object" && !(object[key] instanceof Array)) {
                sortedObj[key] = this.sortObjectAlphabetically(object[key]);
            } else {
                sortedObj[key] = object[key];
            }
        }

        return sortedObj;
    }

    reOrderCredentialProof(proof: IProof): IProof {
        return {
            holder: proof.holder,
            nonce: proof.nonce,
            signature: proof.signature,
            type: proof.type
        };
    }

    /**
     * 
     * @param message - The message to sign (can be anything, object, string, etc.) 
     * @param privateKey - The private key to sign with
     * @returns 
     */
    getSignature(message: any, privateKey: string): string {
        // If the object is stringified
        if (typeof message === "string") {
            message = JSON.parse(message);
        }
        message = this.reOrderObject(message);
        const web3 = new Web3();
        return web3.eth.accounts.sign(JSON.stringify(message), privateKey).signature
    }

    reOrderObject(contentToSign: ISignedContent): ISignedContent {
        return this.sortObjectAlphabetically(contentToSign);
    }

    signCredentialObject(credentialObject: ICredentialObject, privateKey: string) {
        // If the object is stringified
        if (typeof credentialObject === "string") {
            credentialObject = JSON.parse(credentialObject);
        }
        credentialObject = this.reOrderCredentialObject(credentialObject);
        const web3 = new Web3();
        return web3.eth.accounts.sign(JSON.stringify(credentialObject), privateKey).signature
    }

    async getClaims(claimType: number | string, contractAddress: string, web3: Web3): Promise<any> {
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

    async getClaim(claimType: EClaimType, contractAddress: string, web3Url: string, claimHolderAbi: any): Promise<any> {
        const web3 = new Web3(web3Url);
        const contract = new web3.eth.Contract(claimHolderAbi, contractAddress);
        const claimIds = await contract.methods.getClaimIdsByType(claimType).call();
        if (claimIds.length > 0) {
            try {
                const rawClaims = await contract.methods.getClaim(claimIds[claimIds.length - 1]).call();
                const data = web3.utils.toAscii(rawClaims.data)

                if (data.length > 1) {
                    const parsedClaims = JSON.parse(data);
                    return Promise.resolve(parsedClaims);
                } else {
                    return Promise.resolve(null);
                }
            } catch (error) {
                console.log("Error: ", error)
                return Promise.resolve(null);
            }
        } else {
            return Promise.resolve(null);
        }
    }

    requestedCredentialsCorrect(credentials: ICredentialObject, requestedCredentials: IRequestedCredentials): IRequestedCredentialsCheckResult {
        const checkResult: IRequestedCredentialsCheckResult = {
            success: true,
            missingKeys: []
        }
        // Loop all requested credentials
        for (const requestedCredential of requestedCredentials.credentials) {
            if (requestedCredential.required && requestedCredential.provider === "ADDITIONAL_INFO") {
                const objectKeys = Object.keys(credentials.credentials[requestedCredential.provider].credentials);
                for (const key of objectKeys) {
                    const additionalInfo = credentials.credentials[requestedCredential.provider].credentials[key] as IRequestedCredentialKey;
                    if (additionalInfo.required && (additionalInfo.key as IAdditionalInfo[]).find(x => !x.answer)) {
                        checkResult.success = false;
                        checkResult.missingKeys.push(additionalInfo);
                    }
                }
            } else {
                // Check only required keys
                if (requestedCredential.required) {
                    if (!Array.isArray(requestedCredential.provider)) {
                        requestedCredential.provider = [requestedCredential.provider];
                    }
                    let found = false;
                    for (const provider of requestedCredential.provider) {
                        if (credentials.credentials[provider] &&
                            credentials.credentials[provider].credentials &&
                            credentials.credentials[provider].credentials[requestedCredential.key as string]
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
        }
        return checkResult;
    }

    recoverAddressFromSignature(message: string, signature: string, sortAlphabetically?: boolean) {
        const web3 = new Web3();
        if (sortAlphabetically === true) {
            message = this.sortObjectAlphabetically(JSON.parse(message));
            return web3.eth.accounts.recover(JSON.stringify(message), signature);
        } else {
            return web3.eth.accounts.recover(message, signature);
        }
        
    }

    signRequestedCredentials(requestedCredentials: IRequestedCredentials, publicKey: string, privateKey: string): IRequestedCredentials {
        requestedCredentials.proof = {
            holder: publicKey,
            nonce: Date.now(),
            type: ESignatureTypes.ECDSA
        }
        const signature = this.getSignature(requestedCredentials, privateKey);
        requestedCredentials.proof.signature = signature;
        return requestedCredentials;
    }

    async isValidRequestedCredentials(requestedCredentials: IRequestedCredentials, web3Url: string, claimholderAbi: any): Promise<boolean> {
        if (requestedCredentials?.proof?.signature) {
            // Make a copy since we delete the signature of the object; otherwhise we can only check it once and it's gone forever
            const requestedCredentialsCopy: IRequestedCredentials = JSON.parse(JSON.stringify(requestedCredentials));
            delete requestedCredentialsCopy.proof.signature;

            // Recover the public key
            const publicKey = this.recoverAddressFromSignature(JSON.stringify(requestedCredentialsCopy), requestedCredentials.proof.signature, true);
            const web3 = new Web3(web3Url);
            const did = requestedCredentials.id
            if (publicKey !== requestedCredentials.proof.holder) {
                console.error(`Recovered address ${publicKey} does not match holder address ${requestedCredentials.proof.holder}`);
                return false;
            }
            // Check the access level on the contract
            const claimHolderContract = new web3.eth.Contract(claimholderAbi, this.getContractAddressFromDid(did));
            const keccak256OrganisationKey = this.getSha3Key(publicKey, web3);
            const keyPurpose = await this.getKeyPurpose(claimHolderContract, keccak256OrganisationKey) as EDIDAccessLevel;
            return (keyPurpose === EDIDAccessLevel.MANAGEMENT_KEY || keyPurpose === EDIDAccessLevel.ACTION_KEY);
        } else {
            console.error("Requested Credentials doesn't have a signature in the proof. Not checking");
            return false;
        }
    }
    
    async getLicenseClaim(requestedCredentials: IRequestedCredentials, web3Url: string, claimHolderAbi: any): Promise<ICredential> {
        const organisationDid = requestedCredentials.id;
        return await this.getClaim(EClaimType.COMPANY_INFO, this.getContractAddressFromDid(organisationDid), web3Url, claimHolderAbi);
    }

    async isValidLicenseCredentials(credential: ICredential, web3Url: string, claimholderAbi: any): Promise<boolean> {
        if (credential?.proof?.signature) {
            // Make a copy since we delete the signature of the object; otherwhise we can only check it once and it's gone forever
            const credentialsCopy: ICredential = JSON.parse(JSON.stringify(credential));
            delete credentialsCopy.proof.signature;

            // Recover the public key
            const publicKey = this.recoverAddressFromSignature(JSON.stringify(credentialsCopy), credential.proof.signature, true);
            const web3 = new Web3(web3Url);
            if (publicKey !== credentialsCopy.proof.holder) {
                console.error(`Recovered address ${publicKey} does not match holder address ${credentialsCopy.proof.holder}`);
                return false;
            }

            // Check the access level on the contract
            const did = credentialsCopy.issuer.id.replace(/(did:didux|:)/g, "");
            const claimHolderContract = new web3.eth.Contract(claimholderAbi, did);
            const keccak256OrganisationKey = this.getSha3Key(publicKey, web3);
            const keyPurpose = await this.getKeyPurpose(claimHolderContract, keccak256OrganisationKey) as EDIDAccessLevel;
            if (keyPurpose !== EDIDAccessLevel.MANAGEMENT_KEY && keyPurpose !== EDIDAccessLevel.ACTION_KEY) {
                console.error(`Keypurpose ${keyPurpose} not MANAGEMENT_KEY or ACTION_KEY`);
                return false;
            }

            // Check claim expiration date
            if (new Date() > new Date(credential.expirationDate)) {
                console.error(`Claim expired on ${credential.expirationDate}. Please re-new`);
                return false;
            }

            // So all checks done! License claim is valid
            return true;
        } else {
            console.error("Requested Credentials doesn't have a signature in the proof. Not checking");
            return false;
        }
    }

    privateKeyToPublicKey(privateKey: string): string {
        const web3 = new Web3();
        return web3.eth.accounts.privateKeyToAccount(privateKey).address;
    }

    generateChallenge(publicKey: string, did: string, host: string, privateKey: string): IChallenge {
        const web3 = new Web3();
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const challenge = `${publicKey}-${did}-${host}-${timestamp}`;
        const signature = web3.eth.accounts.sign(challenge, privateKey).signature
        return {
            did,
            publicKey,
            endpoint: host,
            timestamp,
            challenge,
            signature
        } as IChallenge
    }

    getContractAddressFromDid(did: string): string {
        let contractAddress = did;
        const splittedDid = did.split(":");
        if (splittedDid.length === 2) {
            console.error("Unsupported did:", did);
            return null;
        } else if (splittedDid.length === 3) {
            if (splittedDid[0] !== "did") {
                console.error("Unsupported did:", did);
                return null;
            } else if (splittedDid[1] !== "didux") {
                console.error("Unsupported chain:", splittedDid[1]);
                return null;
            } else {
                contractAddress = splittedDid[2];
            }
        }
        return contractAddress;
    }
}