export interface IWebRTCConfig {
    signalingUrl: string; // The signaling server to connect to
    isHost?: boolean; // Is the application a host? If not; it is a client
    channel?: string;
    data?: any; // Send some data when setting up the websocket
    keepalive?: boolean; // Should the end user keep the connection alive?
}
