import { Injectable } from "@angular/core";
import { IValidatedCredentials } from "./interfaces/validatedCredentials.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { IRequestedCredentials } from "./interfaces/requestedCredentials.interface";
import { IRequestedCredentialsCheckResult } from "./interfaces/requestedCredentialsCheckResult";
import { ProofmeUtils } from "./proofme-utils";
import { IChallenge } from "./interfaces/challenge.interface";
import { EClaimType } from "./enums/claimTypes.enum";

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

    async isValidLicense(requestedCredentials: IRequestedCredentials, web3Url: string, claimHolderAbi: any): Promise<boolean>  {
        return this.proofmeUtils.isValidLicense(requestedCredentials, web3Url, claimHolderAbi);
    }

    generateChallenge(publicKey: string, did: string, host: string, privateKey: string): IChallenge  {
        return this.proofmeUtils.generateChallenge(publicKey, did, host, privateKey);
    }

    async getClaim(claimType: EClaimType, contractAddress: string, web3Url: string, claimHolderAbi: any): Promise<any>  {
        return await this.proofmeUtils.getClaim(claimType, contractAddress, web3Url, claimHolderAbi);
    }
}