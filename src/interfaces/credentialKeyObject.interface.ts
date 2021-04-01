import { ICredential } from "./credential.interface";
import { IProof } from "./proof.interface";

export interface ICredentialKeyObject {
    credentials: {
        [key: string]: ICredential;
    }
    proof: IProof;
}