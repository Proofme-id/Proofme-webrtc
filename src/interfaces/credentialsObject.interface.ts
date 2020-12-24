import { ICredential } from "./credential.interface";
import { IProof } from "./proof.interface";

export interface ICredentialObject {
    credentials: {
        [key: string]: ICredential
    },
    proof: IProof
}