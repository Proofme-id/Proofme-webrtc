import { ICredential } from "./credential.interface";
import { IIdentifyItem } from "./identifyItem.interface";
import { IProof } from "./proof.interface";

export interface ICredentialObject {
    credentials: {
        [provider: string]: IIdentifyItem
    }
}