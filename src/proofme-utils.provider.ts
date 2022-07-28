import { Injectable } from "@angular/core";
import { IValidatedCredentials } from "./interfaces/validatedCredentials.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { ICredential } from "./interfaces/credential.interface";
import { IProofObject } from "./interfaces/proof-object.interface";
import { IRequestedCredentials } from "./interfaces/requestedCredentials.interface";
import { IRequestedCredentialsCheckResult } from "./interfaces/requestedCredentialsCheckResult";
import { ProofmeUtils } from "./proofme-utils";

@Injectable()
export class ProofmeUtilsProvider {

    proofmeUtils = new ProofmeUtils();

	async validCredentials(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials>  {
        return this.proofmeUtils.validCredentialsFunc(credentialObject, web3Url, checkUserNonce, livenessCheckRequired);
    }

	async validCredentialsTrustedParties(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>  {
        return this.proofmeUtils.validCredentialsTrustedPartiesFunc(credentialObject, web3Url, requestedCredentials, trustedDids, checkUserNonce, livenessCheckRequired);
    }

    signCredential(credential: ICredential, privateKey: string): string  {
        return this.proofmeUtils.signCredential(credential, privateKey);
    }

    signCredentialObject(credential: ICredentialObject, privateKey: string): string  {
        return this.proofmeUtils.signCredentialObject(credential, privateKey);
    }

    signProofObject(proofObject: IProofObject, privateKey: string): string  {
        return this.proofmeUtils.signProofObject(proofObject, privateKey);
    }
}