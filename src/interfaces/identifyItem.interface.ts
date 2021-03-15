import { ICredential } from "./credential.interface";
import { IProof } from "./proof.interface";

export interface IIdentifyItem {
    credentials: {
        [key: string]: ICredential;
    }
    proof: IProof;
}