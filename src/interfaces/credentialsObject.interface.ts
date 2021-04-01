import { ICredential } from "./credential.interface";
import { ICredentialKeyObject } from "./credentialKeyObject.interface";
import { IProof } from "./proof.interface";

export interface ICredentialObject {
    credentials: {
        [provider: string]: ICredentialKeyObject
    }
}