import { EProofmeDataPurpose } from "../enums/proofmeDataPurpose";
import { EProofmeDataStorage } from "../enums/proofmeDataStorage";
import { IRequestedCredentialKey } from "./requestedCredentialKey.interface";

export interface IRequestedCredentials {
    credentials: IRequestedCredentialKey[];
    description?: string;
    pgpDecrypt?: boolean;
    purpose?: EProofmeDataPurpose;
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
    storage?: EProofmeDataStorage
}