export interface IWebRTCConfig {
    signalingUrl: string;
    isHost?: boolean;
    channel?: string;
    data?: any;
    keepalive?: boolean;
}
