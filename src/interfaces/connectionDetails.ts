import { connection } from "websocket";
import { WebRTCClientV2 } from "../webRtcClientV2";

export interface IConnectionDetails extends connection {
    uuid?: string; // Unique identifier for the client
    did?: string; // When authenticated: didAddress
    publicKey?: string; // When authenticated: publicKey
    authenticated?: boolean; // true or false
    host?: boolean; // Are you hosting?
    channel?: string; // connection or client.uuid connected to
    origin?: string;
    webRtcClient?: WebRTCClientV2;
}
