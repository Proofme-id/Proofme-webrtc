import { ICredentialKeyObject } from "./credentialKeyObject.interface";

export interface ICredentialObject {
    credentials: {
        [provider: string]: ICredentialKeyObject
    }
}