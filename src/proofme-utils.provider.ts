import { Injectable } from "@angular/core";
import { IValidatedCredentials } from "./interfaces/validatedCredentials.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { signCredential, signCredentialObject, signProofObject, validCredentialsFunc, validCredentialsTrustedPartiesFunc } from "./functions/functions";
import { ICredential } from "./interfaces/credential.interface";
import { IProofObject } from "./interfaces/proof-object.interface";

@Injectable()
export class ProofmeUtilsProvider {

	async validCredentials(credentialObject: ICredentialObject, identifyByProviders: string[], web3Url: string): Promise<IValidatedCredentials>  {
        return validCredentialsFunc(credentialObject, identifyByProviders, web3Url);
    }

	async validCredentialsTrustedParties(credentialObject: ICredentialObject, web3Url: string, identifyByProviders: string[], trustedDids: string[]): Promise<IValidatedCredentials>  {
        return validCredentialsTrustedPartiesFunc(credentialObject, web3Url, identifyByProviders, trustedDids);
    }

    signCredential(credential: ICredential, privateKey: string): string  {
        return signCredential(credential, privateKey);
    }

    signCredentialObject(credential: ICredentialObject, privateKey: string): string  {
        return signCredentialObject(credential, privateKey);
    }

    signProofObject(proofObject: IProofObject, privateKey: string): string  {
        console.log("ProofmeUtilsProvider signProofObject");
        return signProofObject(proofObject, privateKey);
    }
}