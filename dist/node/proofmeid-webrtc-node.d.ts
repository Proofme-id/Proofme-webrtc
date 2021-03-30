// Generated by dts-bundle v0.7.3
// Dependencies for this module:
//   ../http
//   ../rxjs
//   ../web3

import * as http from "http";
import { BehaviorSubject } from 'rxjs';
import Web3 from "web3";

export class SignalingServer {
        wss: any;
        rtcConnectionConfig: IRTCConnectionConfig;
        /**
            * Web RTC connection config
            * @param rtcConnectionConfig
            */
        setRTCConnectionConfig(rtcConnectionConfig: IRTCConnectionConfig): void;
        /**
            * Returns the configuration for the RTC peerconnection
            */
        getRTCConnectionConfig(type: string): RTCConfiguration;
        /**
            *
            * @param server
            */
        startSignal(server: http.Server): void;
}

export class WebRtcProvider {
        webRtcConfig: IWebRTCConfig;
        hostUuid: string;
        peerConnection: RTCPeerConnection;
        dataChannel: RTCDataChannel;
        wsClient: WebSocket;
        receivedActions$: BehaviorSubject<any>;
        uuid$: BehaviorSubject<any>;
        websocketConnectionClosed$: BehaviorSubject<any>;
        websocketConnectionOpen$: BehaviorSubject<any>;
        websocketConnectionError$: BehaviorSubject<any>;
        webRtcConnectionConfig: RTCConfiguration;
        connectionTimeout: NodeJS.Timeout;
        constructor();
        /**
            * Returns the WebRTC configuration
            */
        getConfig(): IWebRTCConfig;
        /**
            * The client needs to set the host UUID to connect to before setting up the websocket connection
            * @param hostUuid The UUID of the host
            */
        setHostUuid(hostUuid: string): void;
        /**
            * Send data over the data channel
            * @param action As a string, which action type do you want to send?
            * @param data The data to send as an object
            */
        sendData(action: string, data: any): void;
        /**
            * Whenever the UUID is set from the host this observable emits
            * @param uuid The UUID to allow clients connec to
            */
        setUuid(uuid: string): void;
        /**
            * Only disconnect on this application and send no disconnect over the data channel
            */
        disconnect(): void;
        /**
            * Disconnect on this application and send a disconnect event over the datachannel
            */
        remoteDisconnect(): void;
        /**
            * The host will send an offer when a client connects to his UUID
            * @param peerConnection The peer connection to set the local description
            * @param wsClient The websocket to send the offer to
            */
        sendOffer(peerConnection: RTCPeerConnection, wsClient: WebSocket): Promise<void>;
        /**
            * This method will launch the websocket and listen to events
            */
        launchWebsocketClient(webRtcConfig: IWebRTCConfig): Promise<void>;
        /**
            * This method will setup the peerconnection and datachannel
            * It will also emit received actions over an observable
            * @param uuid The UUID to connect to
            */
        setupPeerconnection(uuid: string): Promise<void>;
}

export class ProofmeUtilsProvider {
    validCredentials(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean): Promise<IValidatedCredentials>;
    validCredentialsTrustedParties(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>;
    signCredential(credential: ICredential, privateKey: string): string;
    signCredentialObject(credential: ICredentialObject, privateKey: string): string;
    signProofObject(proofObject: IProofObject, privateKey: string): string;
}

export interface IRTCConnectionConfig {
    stunEnabled: boolean;
    stunUrl: string;
    turnEnabled: boolean;
    turnUrl: string;
    turnSecret: string;
    turnExpiration: number;
}

export interface IWebRTCConfig {
    signalingUrl: string;
    isHost: boolean;
}

export interface IProofObject {
    credentialSubject: {
        credential: {
            description: string;
            hash: string;
            link: string;
            template?: string;
            type: string;
        };
    };
    expirationDate: string;
    id?: string;
    issuanceDate?: number;
    proof?: {
        holder: string;
        nonce: number;
        signature?: string;
        type: string;
    };
    txHash?: string;
    type: string[];
    verifiedCredential?: boolean;
    version: string;
}

export interface IProof {
    holder: string;
    nonce: number;
    type: string;
    signature?: string;
}

export interface IRequestedCredentialKey {
    key: string;
    provider: string | string[];
    name?: string;
    required: boolean;
    expectedValue?: string | boolean | number;
}

export interface IRequestedCredentials {
    credentials: IRequestedCredentialKey[];
    description: string;
    by: string;
    minimumRequired?: {
        data: string[];
        amount: number;
    };
}

export interface IRequestedCredentialsCheckResult {
    success: boolean;
    missingKeys: IRequestedCredentialKey[];
    missingMessage?: string;
    credentials?: ICredentialObject;
}

export function validCredentialsTrustedPartiesFunc(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>;
export function validCredentialsFunc(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean): Promise<IValidatedCredentials>;
export function userCredentialSignatureWrong(holderKey: any, recoveredAddress: string): boolean;
export function issuerCredentialSignatureWrong(credential: any, web3Node: any): boolean;
export function didContractKeyWrong(web3Node: any, web3Url: string, claimHolderAbi: any, holderKey: string, didAddress: string, checkedDid: ICheckedDid[]): Promise<boolean>;
export function knownAddressesContains(list: any[], sha3Key: string, didContractAddress: string): boolean;
export function getSha3Key(key: string, web3Node: any): any;
export function getKeyPurpose(keyManagerContract: any, key: string): Promise<string>;
export function calculateMinutesDifference(dt2: Date, dt1: Date): number;
export function reOrderCredentialProof(proof: IProof): IProof;
export function signCredential(credential: ICredential, privateKey: string): string;
export function signCredentialObject(credential: ICredentialObject, privateKey: string): string;
export function getClaims(claimType: number | string, contractAddress: string, web3: Web3): Promise<any>;
export function signProofObject(proofObject: IProofObject, privateKey: string): string;

export interface IValidatedCredentials {
    code: number;
    credentials?: ICredentialObject;
    invalidCredentials?: ICredential[];
    message: string;
    valid: boolean;
    requestedCheckResult?: IRequestedCredentialsCheckResult;
}

export interface ICredentialObject {
    credentials: {
        [provider: string]: IIdentifyItem;
    };
}

export interface ICredential {
    credentialSubject: {
        credential: {
            type: string;
            value: string;
        };
    };
    expirationDate: string;
    id: string;
    issuanceDate: string;
    issuer: {
        authorityId: string;
        authorityName: string;
        id: string;
        name: string;
    };
    proof?: {
        type: string;
        nonce: number;
        signature: string;
        holder: string;
    };
    provider: string;
    type: string[];
    verifiedCredential?: boolean;
    version: string;
}

export interface ICheckedDid {
    holderKey: string;
    did: string;
    result: boolean;
}

export interface IIdentifyItem {
    credentials: {
        [key: string]: ICredential;
    };
    proof: IProof;
}

