import { Injectable } from "@angular/core";
import { IValidCredential } from "./interfaces/validCredential.interface";
import { ICredentialObject } from "./interfaces/credentialsObject.interface";
import { validCredentialsFunc } from "./functions/functions";

@Injectable()
export class ProofmeUtilsProvider {

	async validCredentials(credentialObject: ICredentialObject, web3Url: string): Promise<IValidCredential>  {
        return validCredentialsFunc(credentialObject, web3Url);
    }
}