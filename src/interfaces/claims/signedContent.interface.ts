import { EMimeType } from "../../enums/mimeTypes.enum";
import { EProofType } from "../../enums/proofType.enum";
import { ESignatureTypes } from "../../enums/signatureTypes.enum";

export interface ISignedContent {
    /**
     * This part is about the content information
     */
    content: {
        creator?: string; // Optional: The did of the person / authority who created the document
        description?: string; // Optional: Additional information about the content
        expirationDate?: number; // Optional: Does this document expire?
        hash: {
            type: string; // The type of the hash (SHA-512 / kecczak256 etc.)
            value: string; // The hash of the content
        }; 
        link: string, // File name or URL
        mimeType: EMimeType; // The mimetype of the file
        template?: string // Optional: For styling the certificate
    };
    id?: string; // did:didux: + owner address public key / did
    /**
     * This part is about the person / the authority that signs the content
     */
    proof?: {
        holder: string, // The public key of the person / the authority that signs the content
        nonce: number, // The unix timestamp of the time of signing 
        signature?: string, // Dont include this while signing, add it after: The signature the person / the authority that signs the content
        type: ESignatureTypes, // Signature type (ECDSA example)
        txHash?: string; // Dont include this while signing, add it after:  The transaction hash of the proof on the blockchain
    };
    type: EProofType, // What type of interface is this?
    version: string; // The version of the current state of this interface
}
