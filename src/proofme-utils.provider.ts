import { Injectable } from "@angular/core";
import { IValidatedCredentials } from "./interfaces/validatedCredentials.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { IRequestedCredentials } from "./interfaces/requestedCredentials.interface";
import { IRequestedCredentialsCheckResult } from "./interfaces/requestedCredentialsCheckResult";
import { ProofmeUtils } from "./proofme-utils";
import { IChallenge } from "./interfaces/challenge.interface";

@Injectable()
export class ProofmeUtilsProvider {

    proofmeUtils = new ProofmeUtils();

	async isValidCredentials(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>  {
        return this.proofmeUtils.isValidCredentials(credentialObject, web3Url, requestedCredentials, trustedDids, checkUserNonce, livenessCheckRequired);
    }

    getSignature(message: any, privateKey: string): string  {
        return this.proofmeUtils.getSignature(message, privateKey);
    }

    signCredentialObject(credential: ICredentialObject, privateKey: string): string  {
        return this.proofmeUtils.signCredentialObject(credential, privateKey);
    }

    async isValidRequestedCredentials(requestedCredentials: IRequestedCredentials, web3Url: string, claimholderAbi: any): Promise<boolean>  {
        return this.proofmeUtils.isValidRequestedCredentials(requestedCredentials, web3Url, claimholderAbi);
    }

    generateChallenge(publicKey: string, did: string, host: string, privateKey: string): IChallenge  {
        return this.proofmeUtils.generateChallenge(publicKey, did, host, privateKey);
    }
}