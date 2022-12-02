export interface IChallenge {
    did: string;
    publicKey: string;
    endpoint: string;
    timestamp: string;
    challenge: string;
    signature: string;
}