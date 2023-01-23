import { ICredentialOwnProvided } from "./credential-own-provided.interface";
import { ICredential } from "./credential.interface";
import { IProof } from "./proof.interface";

export interface ICredentialKeyObject {
    credentials: {
        [key: string]: ICredential | ICredentialOwnProvided;
    }
    proof: IProof;
}