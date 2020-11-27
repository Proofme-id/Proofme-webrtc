export interface IWebRTCConfig {
    signalingUrl: string; // The signaling server to connect to
    isHost: boolean; // Is the application a host? If not; it is a client
}
