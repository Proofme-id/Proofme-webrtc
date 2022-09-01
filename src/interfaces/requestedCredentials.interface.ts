import { IRequestedCredentialKey } from "./requestedCredentialKey.interface";

export interface IRequestedCredentials {
    by?: string;
    credentials: IRequestedCredentialKey[];
    description?: string;
    minimumRequired?: {
        data: string[];
        amount: number;
    }
}