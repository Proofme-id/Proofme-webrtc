import { ICredentialObject } from "./credentialsObject.interface";
import { IRequestedCredentialKey } from "./requestedCredentialKey.interface";

export interface IRequestedCredentialsCheckResult {
    success: boolean;
    missingKeys: IRequestedCredentialKey[];
    missingMessage?: string;
    credentials?: ICredentialObject
}