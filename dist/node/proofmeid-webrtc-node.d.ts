// Generated by dts-bundle v0.7.3
// Dependencies for this module:
//   ../http
//   ../rxjs
//   ../websocket
//   ../web3
//   ../wrtc

import * as http from "http";
import { BehaviorSubject } from "rxjs";
import { w3cwebsocket } from "websocket";
import Web3 from "web3";
import { Subject } from "rxjs";
import { request, server as WebSocketServer } from "websocket";
import { connection } from "websocket";
import { RTCPeerConnection, RTCDataChannel } from "wrtc";

export class SignalingServer {
        wsServer: any;
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
        wsClient: w3cwebsocket;
        receivedActions$: BehaviorSubject<any>;
        uuid$: BehaviorSubject<string>;
        websocketMessage$: BehaviorSubject<any>;
        websocketConnectionClosed$: BehaviorSubject<boolean>;
        websocketConnectionOpen$: BehaviorSubject<boolean>;
        websocketConnectionError$: BehaviorSubject<boolean>;
        webRtcConnectionConfig: RTCConfiguration;
        connectionTimeout: NodeJS.Timeout;
        pongCheckInterval: NodeJS.Timeout;
        pingTimeout: NodeJS.Timeout;
        WEBSOCKET_PING_ANSWER_DELAY: number;
        WEBSOCKET_PING_PONG_ALLOWED_TIME: number;
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
            * Send data over the P2P data channel
            * @param action As a string, which action type do you want to send?
            * @param data The data to send as an object
            */
        sendP2PData(action: string, data: any): void;
        /**
            * Send data over the data channel
            * @param action As a string, which action type do you want to send?
            * @param data The data to send as an object
            */
        sendWebsocketData(action: string, data: any): void;
        getWebsocket(): w3cwebsocket;
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
        sendOffer(peerConnection: RTCPeerConnection, wsClient: w3cwebsocket): Promise<void>;
        /**
            * This method will launch the websocket and listen to events
            */
        launchWebsocketClient(webRtcConfig: IWebRTCConfig): Promise<void>;
        sendPing(): void;
        /**
            * This method will setup the peerconnection and datachannel
            * It will also emit received actions over an observable
            * @param uuid The UUID to connect to
            */
        setupPeerconnection(uuid: string): Promise<void>;
        /**
            * This method will setup the peerconnection and datachannel
            * It will also emit received actions over an observable
            * @param uuid The UUID to connect to
            */
        setupClientPeerconnection(): Promise<void>;
}

export class ProofmeUtilsProvider {
    proofmeUtils: ProofmeUtils;
    validCredentials(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials>;
    validCredentialsTrustedParties(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>;
    signCredential(credential: ICredential, privateKey: string): string;
    signCredentialObject(credential: ICredentialObject, privateKey: string): string;
    signProofObject(proofObject: IProofObject, privateKey: string): string;
}

export class ProofmeUtils {
    validCredentialsTrustedPartiesFunc(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>;
    validCredentialsFunc(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials>;
    userCredentialSignatureWrong(holderKey: any, recoveredAddress: string): boolean;
    issuerCredentialSignatureWrong(credential: any, web3Node: any): boolean;
    didContractKeyWrong(web3Node: any, web3Url: string, claimHolderAbi: any, holderKey: string, didAddress: string, checkedDid: ICheckedDid[]): Promise<boolean>;
    knownAddressesContains(list: any[], sha3Key: string, didContractAddress: string): boolean;
    getSha3Key(key: string, web3Node: any): any;
    getKeyPurpose(keyManagerContract: any, key: string): Promise<string>;
    calculateMinutesDifference(dt2: Date, dt1: Date): number;
    reOrderCredentialObject(credentialObject: ICredentialObject): ICredentialObject;
    reOrderCredential(credential: ICredential): ICredential;
    sortObjectAlphabetically(object: any): any;
    reOrderCredentialProof(proof: IProof): IProof;
    signCredential(credential: ICredential, privateKey: string): string;
    signCredentialObject(credentialObject: ICredentialObject, privateKey: string): string;
    getClaims(claimType: number | string, contractAddress: string, web3: Web3): Promise<any>;
    signProofObject(proofObject: IProofObject, privateKey: string): string;
    reOrderProofObject(proofObject: IProofObject): IProofObject;
    requestedCredentialsCorrect(credentials: ICredentialObject, requestedCredentials: IRequestedCredentials): IRequestedCredentialsCheckResult;
}

export class SignalServerV2 {
        wsServer: WebSocketServer;
        wsRequest$: Subject<any>;
        /**
            *
            * @param httpServer
            */
        startSignal(httpServer: http.Server): void;
        /**
            * Send UTFData to connection.
            * @param channel
            * @param message
            */
        sendTo(channel: any, message: any): void;
        /**
            * Send error
            * @param reason
            * @param
            */
        rejectConnection(reason: string, request: any): void;
        setupP2PConnection(request: request, validSign: boolean, channel: string, originAllowed: boolean, turnExpiration: number, turnUrl: string, turnSecret: string, signalServer: string, requestedCredentials: IRequestedCredentials, actionType: string, data: any): Promise<any>;
        setupWebsocketListeners(connection: IConnectionDetails): void;
}

export function getSubDomain(url: string): string;

export interface IRTCConnectionConfig {
    stunEnabled: boolean;
    stunUrl: string;
    turnEnabled: boolean;
    turnUrl: string;
    turnSecret: string;
    turnExpiration: number;
}

export interface IConnectionDetails extends connection {
    uuid?: string;
    did?: string;
    publicKey?: string;
    authenticated?: boolean;
    host?: boolean;
    channel?: string;
    origin?: string;
    webRtcClient?: WebRTCClientV2;
}

export interface IWebRTCConfig {
    signalingUrl: string;
    isHost: boolean;
    channel?: string;
    data?: any;
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
    verified?: boolean;
    version: string;
}

export interface IProof {
    holder: string;
    nonce: number;
    type: string;
    signature?: string;
}

export interface ICheckedDid {
    holderKey: string;
    did: string;
    result: boolean;
}

export interface IRequestedCredentialKey {
    key: string;
    provider: string | string[];
    name?: string;
    required: boolean;
    expectedValue?: string | boolean | number;
    verified?: boolean;
}

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
        [provider: string]: ICredentialKeyObject;
    };
}

export interface ICredentialKeyObject {
    credentials: {
        [key: string]: ICredential;
    };
    proof: IProof;
}

export interface IRequestedCredentials {
    credentials: IRequestedCredentialKey[];
    description?: string;
    purpose?: IProofmeDataPurpose;
    proof?: {
        holder: string;
        nonce: number;
        signature?: string;
        type: string;
    };
    minimumRequired?: {
        data: string[];
        amount: number;
    };
    requester?: string;
    storage?: IProofmeDataStorage;
}

export interface IRequestedCredentialsCheckResult {
    success: boolean;
    missingKeys: IRequestedCredentialKey[];
    missingMessage?: string;
    credentials?: ICredentialObject;
}

export enum IProofmeDataPurpose {
    AGE_VERIFICATION = "AGE_VERIFICATION",
    KYC_VERIFICATION = "KYC_VERIFICATION",
    ACCESS_CONTROL = "ACCESS_CONTROL",
    ONLINE_VERIFICATION = "ONLINE_VERIFICATION",
    IDENTIFICATION = "IDENTIFICATION"
}

export enum IProofmeDataStorage {
    DATABASE = "DATABASE",
    CERTIFICATE = "CERTIFICATE",
    NOT_STORED = "NOT_STORED"
}

export function checkKeyForDid(web3Url: string, contractAddress: string, publicKey: string, keyToCheck: EDIDAccessLevel): Promise<boolean>;

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
    verified?: boolean;
    version: string;
}

export class WebRTCClientV2 {
        peerConnection: RTCPeerConnection;
        dataChannel: RTCDataChannel;
        clientChannel: IConnectionDetails;
        webRtcConnectionConfig: RTCConfiguration;
        requestedCredentials: IRequestedCredentials;
        hostWsConnection: IConnectionDetails;
        actionType: string;
        dataChannelOpen$: Subject<void>;
        dataChannelMessage$: Subject<any>;
        data: any;
        constructor(webRtcConnectionConfig: RTCConfiguration, requestedCredentials: IRequestedCredentials, hostWsConnection: IConnectionDetails, actionType: string, data: any);
        /**
            * This method will setup the peerconnection and datachannel
            * It will also emit received actions over an observable
            * @param uuid The UUID to connect to
            */
        setupPeerconnection(channelUuid: string): Promise<void>;
        /**
            * The host will send an offer when a client connects to his UUID
            */
        sendOffer(): Promise<void>;
        /**
            * Send data over the data channel
            * @param action As a string, which action type do you want to send?
            * @param data The data to send as an object
            */
        sendData(action: string, data: any): void;
        setRemoteDescription(offer: string): Promise<void>;
        addCandidate(candidate: string): Promise<void>;
        sendAnswer(): Promise<void>;
        setClientChannel(channel: IConnectionDetails): void;
}

export enum EDIDAccessLevel {
    MANAGEMENT_KEY = 1,
    ACTION_KEY = 2,
    CLAIM_SIGNER_KEY = 3,
    ENCRYPTION_KEY = 4
}

