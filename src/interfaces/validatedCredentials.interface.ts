import { ICredential } from "./credential.interface";
import { ICredentialObject } from "./credentialsObject.interface";
import { IRequestedCredentialsCheckResult } from "./requestedCredentialsCheckResult";
export interface IValidatedCredentials {
	code: number;
    credentials?: ICredentialObject
    invalidCredentials?: ICredential[];
	message: string;
	valid: boolean;
	requestedCheckResult?: IRequestedCredentialsCheckResult;
}