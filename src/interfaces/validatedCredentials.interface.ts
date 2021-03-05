import { ICredential } from "./credential.interface";
import { IProof } from "./proof.interface";

export interface IValidatedCredentials {
	code: number;
    credentials?: { [key: string]: ICredential; };
    invalidCredentials?: ICredential[];
	message: string;
	proof?: IProof;
	valid: boolean;
}