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
import { OutgoingHttpHeaders } from "http";
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
        sendWebsocketData(action: string, data: any): boolean;
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
        launchWebsocketClient(webRtcConfig: IWebRTCConfig, headers?: OutgoingHttpHeaders): Promise<void>;
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
    isValidCredentials(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>;
    getSignature(message: any, privateKey: string): string;
    signCredentialObject(credential: ICredentialObject, privateKey: string): string;
    signRequestedCredentials(requestedCredentials: IRequestedCredentials, did: string, privateKey: string): IRequestedCredentials;
    isValidRequestedCredentials(requestedCredentials: IRequestedCredentials, web3Url: string, claimholderAbi: any): Promise<boolean>;
    isValidLicense(requestedCredentials: IRequestedCredentials, web3Url: string, claimHolderAbi: any): Promise<boolean>;
    generateChallenge(publicKey: string, did: string, host: string, privateKey: string): IChallenge;
    getClaim(claimType: EClaimType, contractAddress: string, web3Url: string, claimHolderAbi: any): Promise<any>;
}

export class ProofmeUtils {
    isValidCredentials(credentialObject: ICredentialObject, web3Url: string, requestedCredentials: IRequestedCredentials, trustedDids: string[], checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials | IRequestedCredentialsCheckResult>;
    checkCredentials(credentialObject: ICredentialObject, web3Url: string, checkUserNonce: boolean, livenessCheckRequired?: boolean): Promise<IValidatedCredentials>;
    userCredentialSignatureWrong(holderKey: any, recoveredAddress: string): boolean;
    issuerCredentialSignatureWrong(credential: any, web3Node: any): boolean;
    didContractKeyWrong(web3Node: any, web3Url: string, claimHolderAbi: any, holderKey: string, didAddress: string, checkedDid: ICheckedDid[]): Promise<boolean>;
    knownAddressesContains(list: any[], sha3Key: string, didContractAddress: string): boolean;
    getSha3Key(key: string, web3: Web3): string;
    getKeyPurpose(keyManagerContract: any, key: string): Promise<EDIDAccessLevel>;
    calculateMinutesDifference(dt2: Date, dt1: Date): number;
    reOrderCredentialObject(credentialObject: ICredentialObject): ICredentialObject;
    reOrderCredential(credential: ICredential): ICredential;
    sortObjectAlphabetically(object: any): any;
    reOrderCredentialProof(proof: IProof): IProof;
    /**
      *
      * @param message - The message to sign (can be anything, object, string, etc.)
      * @param privateKey - The private key to sign with
      * @returns
      */
    getSignature(message: any, privateKey: string): string;
    reOrderObject(contentToSign: ISignedContent): ISignedContent;
    signCredentialObject(credentialObject: ICredentialObject, privateKey: string): string;
    getClaims(claimType: number | string, contractAddress: string, web3: Web3): Promise<any>;
    getClaim(claimType: EClaimType, contractAddress: string, web3Url: string, claimHolderAbi: any): Promise<any>;
    requestedCredentialsCorrect(credentials: ICredentialObject, requestedCredentials: IRequestedCredentials): IRequestedCredentialsCheckResult;
    recoverAddressFromSignature(message: string, signature: string, sortAlphabetically?: boolean): string;
    signRequestedCredentials(requestedCredentials: IRequestedCredentials, did: string, privateKey: string): IRequestedCredentials;
    isValidRequestedCredentials(requestedCredentials: IRequestedCredentials, web3Url: string, claimholderAbi: any): Promise<boolean>;
    isValidLicense(requestedCredentials: IRequestedCredentials, web3Url: string, claimHolderAbi: any): Promise<boolean>;
    privateKeyToPublicKey(privateKey: string): string;
    generateChallenge(publicKey: string, did: string, host: string, privateKey: string): IChallenge;
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
        setupP2PConnection(request: request, validSign: boolean, channel: string, originAllowed: boolean, turnExpiration: number, turnUrl: string, turnSecret: string, signalServer: string, requestedCredentials: IRequestedCredentials, actionType: string, data: any, origin: string): Promise<any>;
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
    isHost?: boolean;
    channel?: string;
    data?: any;
}

export enum EMimeType {
    AAC = "audio/aac",
    ABW = "application/x-abiword",
    ARC = "application/x-freearc",
    AVI = "video/x-msvideo",
    AZW = "application/vnd.amazon.ebook",
    BIN = "application/octet-stream",
    BMP = "image/bmp",
    BZ = "application/x-bzip",
    BZ2 = "application/x-bzip2",
    CSH = "application/x-csh",
    CSS = "text/css",
    CSV = "text/csv",
    DOC = "application/msword",
    DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    EOT = "application/vnd.ms-fontobject",
    EPUB = "application/epub+zip",
    GZ = "application/gzip",
    GIF = "image/gif",
    HTM = "text/html",
    HTML = "text/html",
    ICO = "image/vnd.microsoft.icon",
    ICS = "text/calendar",
    JAR = "application/java-archive",
    JPEG = ".jpg",
    JS = "text/javascript",
    JSON = "application/json",
    JSONLD = "application/ld+json",
    MID = ".midi",
    MJS = "text/javascript",
    MP3 = "audio/mpeg",
    MPEG = "video/mpeg",
    MPKG = "application/vnd.apple.installer+xml",
    ODP = "application/vnd.oasis.opendocument.presentation",
    ODS = "application/vnd.oasis.opendocument.spreadsheet",
    ODT = "application/vnd.oasis.opendocument.text",
    OGA = "audio/ogg",
    OGV = "video/ogg",
    OGX = "application/ogg",
    OPUS = "audio/opus",
    OTF = "font/otf",
    PNG = "image/png",
    PDF = "application/pdf",
    PHP = "application/php",
    PPT = "application/vnd.ms-powerpoint",
    PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    RAR = "application/vnd.rar",
    RTF = "application/rtf",
    SH = "application/x-sh",
    SVG = "image/svg+xml",
    SWF = "application/x-shockwave-flash",
    TAR = "application/x-tar",
    TIF = "image/tiff",
    TIFF = "image/tiff",
    TS = "video/mp2t",
    TTF = "font/ttf",
    TXT = "text/plain",
    URI = "text/x-uri",
    VSD = "application/vnd.visio",
    WAV = "audio/wav",
    WEBA = "audio/webm",
    WEBM = "video/webm",
    WEBP = "image/webp",
    WOFF = "font/woff",
    WOFF2 = "font/woff2",
    XHTML = "application/xhtml+xml",
    XLS = "application/vnd.ms-excel",
    XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    XML = "XML",
    XUL = "application/vnd.mozilla.xul+xml",
    ZIP = "application/zip",
    GP3 = "video/3gpp",
    G23 = "video/3gpp2",
    Z7 = "application/x-7z-compressed"
}

export enum ESignatureTypes {
    ECDSA = "ECDSA",
    RSA = "RSA",
    HMAC = "HMAC"
}

export enum EClaimType {
    SIGNED_CONTENT = 1000,
    COMPANY_INFO = 2000,
    VALIDATORS = 2001,
    USERS = 2002
}

export interface ISignedContent {
        /**
            * This part is about the content information
            */
        content: {
                creator?: string;
                description?: string;
                expirationDate?: number;
                hash: {
                        type: string;
                        value: string;
                };
                link: string;
                mimeType: EMimeType;
                template?: string;
        };
        id?: string;
        /**
            * This part is about the person / the authority that signs the content
            */
        proof?: {
                holder: string;
                nonce: number;
                signature?: string;
                type: ESignatureTypes;
                txHash?: string;
        };
        type: EProofType;
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
    key: string | IAdditionalInfo[];
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
        [key: string]: ICredential | ICredentialOwnProvided | IAdditionalInfo;
    };
    proof: IProof;
}

export interface IRequestedCredentials {
    credentials: IRequestedCredentialKey[];
    description?: string;
    pgpDecrypt?: boolean;
    purpose?: EProofmeDataPurpose;
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
    storage?: EProofmeDataStorage;
}

export interface IRequestedCredentialsCheckResult {
    success: boolean;
    missingKeys: IRequestedCredentialKey[];
    missingMessage?: string;
    credentials?: ICredentialObject;
}

export enum EProofmeDataPurpose {
    AGE_VERIFICATION = "AGE_VERIFICATION",
    KYC_VERIFICATION = "KYC_VERIFICATION",
    ACCESS_CONTROL = "ACCESS_CONTROL",
    ONLINE_VERIFICATION = "ONLINE_VERIFICATION",
    IDENTIFICATION = "IDENTIFICATION"
}

export enum EProofmeDataStorage {
    DATABASE = "DATABASE",
    CERTIFICATE = "CERTIFICATE",
    NOT_STORED = "NOT_STORED"
}

export const enum EProofType {
    CREDENTIAL = "CREDENTIAL",
    SIGNED_CONTENT = "SIGNED_CONTENT"
}

export const enum EWebsocketReadyState {
    /** Socket has been created. The connection is not yet open. */
    CONNECTING = 0,
    /** The connection is open and ready to communicate. */
    OPEN = 1,
    /** The connection is in the process of closing. */
    CLOSING = 2,
    /** The connection is closed or couldn't be opened. */
    CLOSED = 3
}

export function checkKeyForDid(web3Url: string, contractAddress: string, publicKey: string, keyToCheck: EDIDAccessLevel): Promise<boolean>;

export interface IAdditionalInfo {
    language?: string;
    question?: string;
    answer?: string;
}

export interface IChallenge {
    did: string;
    publicKey: string;
    endpoint: string;
    timestamp: string;
    challenge: string;
    signature: string;
}

export enum EDIDAccessLevel {
    NONE = "0",
    MANAGEMENT_KEY = "1",
    ACTION_KEY = "2",
    CLAIM_SIGNER_KEY = "3",
    ENCRYPTION_KEY = "4"
}

export interface ICredential {
    credentialSubject: {
        credential: {
            type: string;
            value: TCredentialValue;
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
        signature?: string;
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
        sendP2PData(action: string, data: any): void;
        /**
            * Sets the remote description of the other side
            * @param remoteDescription Can be offer or answer depending on the client / host
            */
        setRemoteDescription(remoteDescription: string): Promise<void>;
        addCandidate(candidate: string): Promise<void>;
        sendAnswer(): Promise<void>;
}

export interface ICredentialOwnProvided {
    value: string | number | boolean;
}

/**
  * string = most of the values
  * string[] = photo vectors
  * number = no use yet
  * boolean = older than
  */
export type TCredentialValue = string | string[] | number | boolean | ICompanyInfo;

export interface ICompanyInfo {
    addressAdditions: string;
    btwNumber: string;
    contactEmail: string;
    contactName: string;
    contactPhone: string;
    hashedPublicKey: string;
    kvkNumber: string;
    status: boolean;
    organisationAddress: string;
    organisationCity: string;
    organisationName: string;
    postalCode: string;
}

