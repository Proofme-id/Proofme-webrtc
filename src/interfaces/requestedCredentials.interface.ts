import { EProofmeDataPurpose } from "../enums/proofmeDataPurpose";
import { EProofmeDataStorage } from "../enums/proofmeDataStorage";
import { IRequestedCredentialKey } from "./requestedCredentialKey.interface";

export interface IRequestedCredentials {
    credentials: IRequestedCredentialKey[];
    description?: string;
    purpose?: EProofmeDataPurpose;
    id?: string;
    proof?: {
        holder: string;
        nonce: number;
        signature?: string;
        type: string;
    }
    requester?: string;
    storage?: EProofmeDataStorage
}