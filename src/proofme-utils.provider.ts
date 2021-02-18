import { Injectable } from "@angular/core";
import { IValidCredential } from "./interfaces/validCredential.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { signCredential, signCredentialObject, validCredentialsFunc, validCredentialsTrustedPartiesFunc } from "./functions/functions";
import { ICredential } from "./interfaces/credential.interface";
import { IIdentifyByCredentials } from "./interfaces/identifyByCredentials.interface";

@Injectable()
export class ProofmeUtilsProvider {

	async validCredentials(credentialObject: ICredentialObject, identifyByCredentials: IIdentifyByCredentials[], web3Url: string): Promise<IValidCredential>  {
        return validCredentialsFunc(credentialObject, identifyByCredentials, web3Url);
    }

	async validCredentialsTrustedParties(credentialObject: ICredentialObject, web3Url: string, identifyByCredentials: IIdentifyByCredentials[], trustedDids: string[]): Promise<IValidCredential>  {
        return validCredentialsTrustedPartiesFunc(credentialObject, web3Url, identifyByCredentials, trustedDids);
    }

    signCredential(credential: ICredential, privateKey: string): string  {
        return signCredential(credential, privateKey);
    }

    signCredentialObject(credential: ICredentialObject, privateKey: string): string  {
        return signCredentialObject(credential, privateKey);
    }
}