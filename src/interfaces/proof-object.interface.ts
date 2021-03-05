export interface IProofObject {
    credentialSubject: {
        credential: {
            description: string;
            hash: string,
            link: string,
            template?: string,
            type: string
        }
    };
    expirationDate: string;
    id?: string;
    issuanceDate?: number;
    proof?: {
        holder: string,
        nonce: number,
        signature?: string,
        type: string
    };
    txHash?: string;
    type: string[];
    verifiedCredential?: boolean;
    version: string;
}
