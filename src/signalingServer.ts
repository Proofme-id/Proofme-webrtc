import * as WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";
import { IRTCConnectionConfig } from "./interfaces/rtcConnectionConfig.interface";
import * as http from "http";

export class SignalingServer {
    wsServer: any;
    rtcConnectionConfig: IRTCConnectionConfig; 

    /**
     * Web RTC connection config
     * @param rtcConnectionConfig 
     */
    setRTCConnectionConfig(rtcConnectionConfig: IRTCConnectionConfig): void {
        this.rtcConnectionConfig = rtcConnectionConfig;
    }

    /**
     * Returns the configuration for the RTC peerconnection
     */
    getRTCConnectionConfig(type: string): RTCConfiguration {
        if (this.rtcConnectionConfig.turnEnabled) {
            const time = Math.floor(Date.now() / 1000);
            const expiration = this.rtcConnectionConfig.turnExpiration;
            const username = `${time + expiration}:${type}`;
            const credential = crypto.createHmac("sha1", this.rtcConnectionConfig.turnSecret).update(username.toString()).digest("base64");
            return {
                iceCandidatePoolSize: 5,
                iceServers: [{
                    urls: [this.rtcConnectionConfig.turnUrl],
                    credential,
                    username,
                }],
            } as RTCConfiguration;
        } else if (this.rtcConnectionConfig.stunEnabled) {
            return {
                iceServers: [{
                    urls: [this.rtcConnectionConfig.stunUrl],
                }],
            } as RTCConfiguration;
        }
    }

    /**
     * 
     * @param server 
     */
    public startSignal(server: http.Server): void {
        this.wsServer = new WebSocket.Server({ server });

        const sendTo = (datachannel: RTCDataChannel, message: any) => {
            datachannel.send(JSON.stringify(message));
        };

        this.wsServer.on("connection", (ws: any) => {
            ws.uuid = uuidv4(); // Unique identifier for the client
            ws.did = null; // When authenticated: publicKey or didAddress
            ws.host = false; // Is a host, true or false
            ws.authenticated = false; // true or false
            ws.connected = null; // null or client.uuid connected to

            ws.on("error", (err: any) => {
                // ECONNRESET can get thrown when the client disconnects. This application
                // will crash. Ignore this error.
            });

            ws.on("message", (msg: any) => {
                let data: any;

                // accepting only JSON messages
                try {
                    data = JSON.parse(msg);
                } catch (e) {
                    data = {};
                }
                const { type, token, host, offer, answer, candidate } = data;
                switch (type) {
                    // when a user tries to login
                    case "auth":
                        // Check if username is available
                        if (!token) {
                            sendTo(ws, {
                                type: "auth",
                                success: false,
                                message: "Could not validate token"
                            });
                        } else {
                            // Validate token
                            ws.authenticated = true;
                            sendTo(ws, {
                                type: "AUTH",
                                success: true,
                                message: "Authentication successful"
                            });
                        }
                        break;
                    case "host":
                        // Setup a channel (Host)
                        ws.host = true;
                        sendTo(ws, {
                            type: "host",
                            success: true,
                            message: "Host initialised " + ws.uuid,
                            uuid: ws.uuid,
                            webRtcConnectionConfig: this.getRTCConnectionConfig("host")
                        });
                        break;
                    case "ping":
                        // Setup a channel (Host)
                        sendTo(ws, {
                            type: "pong"
                        });
                        break;
                    case "connect": {
                        // Connect to a channel (Host)
                        const hosts = [...this.wsServer.clients].filter((client) => {
                            return client.uuid === host && client.connected === null && client.host === true;
                        });

                        if (hosts.length === 1) {
                            // Host
                            sendTo(hosts[0], {
                                type: "connected",
                                success: true,
                                message: "Client connected " + ws.uuid,
                                uuid: ws.uuid,
                                webRtcConnectionConfig: this.getRTCConnectionConfig("host")
                            });

                            // Client
                            sendTo(ws, {
                                type: "connected",
                                success: true,
                                message: "Connected to " + host,
                                webRtcConnectionConfig: this.getRTCConnectionConfig("client")
                            });

                            // Link them together
                            ws.connected = hosts[0].uuid;
                            hosts[0].connected = ws.uuid;
                        } else {
                            sendTo(ws, {
                                type: "connected",
                                success: false,
                                message: "Could not connect to " + host,
                            });
                        }
                        break;
                    }
                    case "offer":
                        // if Client exists then send him offer details
                        if (ws.connected != null && this.wsServer.clients.size > 0) {

                            const hostsOffer = [...this.wsServer.clients].filter((client) => {
                                return client.connected === ws.uuid;
                            });

                            if (hostsOffer.length === 1) {
                                sendTo(hostsOffer[0], {
                                    type: "offer",
                                    success: true,
                                    offer
                                });
                                sendTo(ws, {
                                    type: "offer",
                                    success: true,
                                    offer
                                });
                            } else {
                                sendTo(ws, {
                                    type: "offer",
                                    success: false,
                                    offer,
                                    message: "Connection not found."
                                });
                            }
                        } else {
                            sendTo(ws, {
                                type: "offer",
                                success: false,
                                offer,
                                message: "Too soon..."
                            });
                        }
                        break;
                    case "answer":
                        // if Client response to an offer with an answer
                        if (ws.connected != null) {

                            const hostsOffer = [...this.wsServer.clients].filter((client) => {
                                return client.connected === ws.uuid;
                            });

                            if (hostsOffer.length === 1) {
                                sendTo(hostsOffer[0], {
                                    type: "answer",
                                    success: true,
                                    answer
                                });
                                sendTo(ws, {
                                    type: "answer",
                                    success: true,
                                    answer
                                });
                            } else {
                                sendTo(ws, {
                                    type: "answer",
                                    success: false,
                                    answer,
                                    message: "Connection not found."
                                });
                            }
                        } else {
                            sendTo(ws, {
                                type: "answer",
                                success: false,
                                answer,
                                message: "Too soon..."
                            });
                        }
                        break;
                    case "candidate":
                        // if Client response to an offer with an answer
                        if (ws.connected != null) {

                            const hostsOffer = [...this.wsServer.clients].filter((client) => {
                                return client.connected === ws.uuid;
                            });

                            if (hostsOffer.length === 1) {
                                sendTo(hostsOffer[0], {
                                    type: "candidate",
                                    success: true,
                                    candidate
                                });
                            } else {
                                sendTo(ws, {
                                    type: "candidate",
                                    success: false,
                                    candidate,
                                    message: "Connection not found."
                                });
                            }
                        } else {
                            sendTo(ws, {
                                type: "candidate",
                                success: false,
                                candidate,
                                message: "Too soon..."
                            });
                        }
                        break;
                    case "leave":
                        if (ws.connected != null) {
                            const clients = [...this.wsServer.clients].filter((client) => {
                                return client.connected === ws.uuid;
                            });

                            ws.uuid = uuidv4();

                            if (clients.length === 1) {
                                sendTo(clients[0], {
                                    type: "leave",
                                    success: true,
                                    message: "Connection left on receive leave"
                                    
                                });
                                clients[0].connected = null;

                                sendTo(ws, {
                                    type: "leave",
                                    success: true,
                                    message: "Connection left.",
                                    uuid: ws.uuid
                                });
                            } else {
                                sendTo(ws, {
                                    type: "leave",
                                    success: false,
                                    message: "Connection not found.",
                                    uuid: ws.uuid
                                });
                            }
                            ws.connected = null;
                        } else {
                            ws.uuid = uuidv4();
                            sendTo(ws, {
                                type: "leave",
                                success: false,
                                message: "Not connected to host/client.",
                                uuid: ws.uuid
                            });
                        }
                        break;
                    default:
                        sendTo(ws, {
                            type: "error",
                            message: "Command not found: " + type
                        });
                        break;
                }
            });

            ws.on("close", (wsArg: any, request: any, client: any) => {
                if (wsArg.connected != null) {
                    const clients = [...this.wsServer.clients].filter((clientArg) => {
                        return clientArg.connected === wsArg.uuid;
                    });

                    if (clients.length === 1) {
                        sendTo(clients[0], {
                            type: "leave",
                            success: true,
                            message: "Connection left on websocket close"
                        });
                        clients[0].connected = null;
                    }
                    wsArg.connected = null;
                }
            });
            // send immediately a feedback to the incoming connection
            ws.send(
                JSON.stringify({
                    type: "connect",
                    message: "Well hello there, I am the Signaling Server",
                    success: true,
                })
            );
        });
    }
}
