import { TCredentialValue } from "../types/credentialValue.type";

export interface ICredential {
    credentialSubject: {
        credential: {
            type: string,
            value: TCredentialValue
        }
    };
    expirationDate: string;
    id: string;
    issuanceDate: string;
    issuer: {
        authorityId: string,
        authorityName: string,
        id: string,
        name: string
    };
    proof?: {
        type: string,
        nonce: number,
        signature?: string
        holder: string;
    };
    provider: string;
    type: string[];
    verifiedCredential?: boolean;
    verified?: boolean;
    version: string;
}