import { Injectable } from "@angular/core";
import { IValidatedCredentials } from "./interfaces/validatedCredentials.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { IRequestedCredentials } from "./interfaces/requestedCredentials.interface";
import { IRequestedCredentialsCheckResult } from "./interfaces/requestedCredentialsCheckResult";
import { ProofmeUtils } from "./proofme-utils";
import { IChallenge } from "./interfaces/challenge.interface";
import { EClaimType } from "./enums/claimTypes.enum";
import { ICredential } from "./interfaces/credential.interface";

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

    signRequestedCredentials(requestedCredentials: IRequestedCredentials, did: string, privateKey: string): IRequestedCredentials  {
        return this.proofmeUtils.signRequestedCredentials(requestedCredentials, did, privateKey);
    }

    async isValidRequestedCredentials(requestedCredentials: IRequestedCredentials, web3Url: string, claimholderAbi: any): Promise<boolean>  {
        return this.proofmeUtils.isValidRequestedCredentials(requestedCredentials, web3Url, claimholderAbi);
    }

    async getLicenseClaim(requestedCredentials: IRequestedCredentials, web3Url: string, claimHolderAbi: any): Promise<ICredential>  {
        return this.proofmeUtils.getLicenseClaim(requestedCredentials, web3Url, claimHolderAbi);
    }

    async isValidLicenseCredentials(credential: ICredential, web3Url: string, claimholderAbi: any): Promise<boolean>  {
        return this.proofmeUtils.isValidLicenseCredentials(credential, web3Url, claimholderAbi);
    }

    generateChallenge(publicKey: string, did: string, host: string, privateKey: string): IChallenge  {
        return this.proofmeUtils.generateChallenge(publicKey, did, host, privateKey);
    }

    async getClaim(claimType: EClaimType, contractAddress: string, web3Url: string, claimHolderAbi: any): Promise<any>  {
        return await this.proofmeUtils.getClaim(claimType, contractAddress, web3Url, claimHolderAbi);
    }

    getContractAddressFromDid(did: string): string  {
        return this.proofmeUtils.getContractAddressFromDid(did);
    }
}