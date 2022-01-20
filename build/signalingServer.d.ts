/// <reference types="node" />
import { IRTCConnectionConfig } from "./interfaces/rtcConnectionConfig.interface";
import * as http from "http";
export declare class SignalingServer {
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
