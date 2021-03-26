import { IRequestedCredentialKey } from "./requestedCredentialKey.interface";

export interface IRequestedCredentials {
    credentials: IRequestedCredentialKey[];
    description: string;
    by: string;
    minimumRequired?: {
        data: string[];
        amount: number;
    }
}