import { IProofmeDataPurpose } from "../enums/proofmeDataPurpose";
import { IProofmeDataStorage } from "../enums/proofmeDataStorage";
import { IRequestedCredentialKey } from "./requestedCredentialKey.interface";

export interface IRequestedCredentials {
    credentials: IRequestedCredentialKey[];
    description?: string;
    purpose?: IProofmeDataPurpose;
    proof?: {
        holder: string;
        nonce: number;
        signature?: string;
        type: string;
    }
    minimumRequired?: {
        data: string[];
        amount: number;
    }
    requester?: string;
    storage?: IProofmeDataStorage
}