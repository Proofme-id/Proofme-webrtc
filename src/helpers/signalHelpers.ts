import { IConnectionDetails } from "../interfaces/connectionDetails";
import crypto from "crypto";

/**
 * Check if a channelId is valid and exists
 * @param channelId
 * @param connections
 */
export function validChannelId(channelId: string, connections: IConnectionDetails[]): boolean {
    // Check if channelId is present in connections
    // Check if channelId is not already connected
    const hosts = connections.filter((client: IConnectionDetails) => {
        return client.uuid === channelId && client.channel === null && client.host === true;
    });

    return hosts.length === 1;
}

/**
 * Returns the configuration for the RTC peerconnection
 */
export function getRTCConnectionConfig(type: string, turnExpiration: number, turnSecret: string, turnUrl: string | string[]): RTCConfiguration {
    const time = Math.floor(Date.now() / 1000);
    const username = `${time + turnExpiration}:${type}`;
    const credential = crypto.createHmac("sha1", turnSecret).update(username.toString()).digest("base64");
    return {
        iceCandidatePoolSize: 5,
        iceServers: [{
            urls: turnUrl,
            credential,
            username,
        }],
    } as RTCConfiguration;
}
