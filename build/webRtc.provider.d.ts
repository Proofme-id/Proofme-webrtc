/// <reference types="node" />
import { BehaviorSubject } from "rxjs";
import { IWebRTCConfig } from "./interfaces/webRtcConfig.interface";
import { w3cwebsocket } from "websocket";
export declare class WebRtcProvider {
    webRtcConfig: IWebRTCConfig;
    hostUuid: string;
    peerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;
    wsClient: w3cwebsocket;
    receivedActions$: BehaviorSubject<any>;
    uuid$: BehaviorSubject<any>;
    websocketConnectionClosed$: BehaviorSubject<any>;
    websocketConnectionOpen$: BehaviorSubject<any>;
    websocketConnectionError$: BehaviorSubject<any>;
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
}
