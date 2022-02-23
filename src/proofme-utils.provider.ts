import { Injectable } from "@angular/core";
import { IValidatedCredentials } from "./interfaces/validatedCredentials.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { signCredential, signCredentialObject, signProofObject, validCredentialsFunc, validCredentialsTrustedPartiesFunc } from "./functions/functions";
import { ICredential } from "./interfaces/credential.interface";
import { IProofObject } from "./interfaces/proof-object.interface";
import { IRequestedCredentials } from "./interfaces/requestedCredentials.interface";
import { IRequestedCredentialsCheckResult } from "./interfaces/requestedCredentialsCheckResult";

@Injectable()
export class ProofmeUtilsProvider {

	async validCredentials(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials>  {
        return validCredentialsFunc(credentialObject, web3Url, checkUserNonce, livenessCheckRequired);
    }

	async validCredentialsTrustedParties(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>  {
        return validCredentialsTrustedPartiesFunc(credentialObject, web3Url, requestedCredentials, trustedDids, checkUserNonce, livenessCheckRequired);
    }

    signCredential(credential: ICredential, privateKey: string): string  {
        return signCredential(credential, privateKey);
    }

    signCredentialObject(credential: ICredentialObject, privateKey: string): string  {
        return signCredentialObject(credential, privateKey);
    }

    signProofObject(proofObject: IProofObject, privateKey: string): string  {
        return signProofObject(proofObject, privateKey);
    }
}