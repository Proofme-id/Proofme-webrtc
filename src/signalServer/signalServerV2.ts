import * as http from "http";
import { BehaviorSubject, Subject } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import { request, server as WebSocketServer } from "websocket";
import { getRTCConnectionConfig } from "../helpers/signalHelpers";
import { IConnectionData } from "../interfaces/connectionData";
import { IConnectionDetails } from "../interfaces/connectionDetails";
import { IRequestedCredentials } from "../interfaces/requestedCredentials.interface";
import { WebRTCClientV2 } from "../webRtcClientV2";

export class SignalServerV2 {
    wsServer: WebSocketServer;
    wsRequest$ = new Subject<any>();

    /**
     *
     * @param httpServer
     */

    public startSignal(
        httpServer: http.Server
    ): void {

        /**
         * Setup websocket server
         */
        this.wsServer = new WebSocketServer({
            httpServer: httpServer,
            autoAcceptConnections: false
        });

        /**
         * Websocket events
         */
        this.wsServer.on("request", async (request) => {
            this.wsRequest$.next(request);
        });
    }

    /**
     * Send UTFData to connection.
     * @param channel
     * @param message
     */
    public sendTo(channel, message) {
        channel.sendUTF(JSON.stringify(message));
    }

    /**
     * Send error
     * @param reason
     * @param
     */
    public rejectConnection(reason: string, request: any) {
        request.reject();
        console.error((new Date().toISOString()) + " " + reason);
        console.error((new Date().toISOString()) + " Connection from remoteAddress " + request.remoteAddresses + " rejected.");
    }

    async setupP2PConnection(
        request: request,
        validSign: boolean,
        channel: string,
        originAllowed: boolean,
        turnExpiration: number,
        turnUrl: string,
        turnSecret: string,
        signalServer: string,
        requestedCredentials: IRequestedCredentials,
        actionType: string,
        data: any,
        origin: string
    ): Promise<any> {
        /**
         * Since all is well, we accept the connection
         * Accept connection
         */
        const connection: IConnectionDetails = request.accept(null, request.origin);
        console.log(`Library - Accepted ${request.origin} valid signed ${validSign}`);

        /**
         * Setup default values upon connect
         */
        connection.uuid = uuidv4(); // Unique identifier for the client
        connection.did = validSign ? (request?.resourceURL?.query as any)?.did?.toString() : null; // When authenticated: didAddress
        connection.publicKey = validSign ? (request?.resourceURL?.query as any)?.publickey?.toString() : null; // When authenticated: publicKey
        connection.authenticated = validSign; // true or false
        connection.channel = channel; // connection or client.uuid connected to

        this.setupWebsocketListeners(connection);

        // Host
        if ((origin === "validator" && validSign && channel === null) || (originAllowed && channel === null)) {
            // connection is verified!
            connection.host = true;
            connection.origin = origin;
            const webRtcConfig = getRTCConnectionConfig("host", turnExpiration, turnSecret, turnUrl);
            console.log("Library - Host waiting for connection");
            this.sendTo(connection, {
                type: "host",
                success: true,
                message: `Host initialised ${connection.uuid}`,
                channelId: connection.uuid,
                signalServer,
                ...(origin === "validator" && { webRtcConnectionConfig: webRtcConfig })
            });
            if (origin !== "validator") {
                connection.webRtcClient = new WebRTCClientV2(webRtcConfig, requestedCredentials, connection, actionType, data);
                await connection.webRtcClient.setupPeerconnection(connection.uuid);
            }
            // Client
        } else if (channel !== null) {
            // Let's find the host to connect to, and connect
            const hostChannel: IConnectionDetails = this.wsServer.connections.find((conn: IConnectionDetails) => conn.uuid === channel && conn.channel === null && conn.host === true);
            if (hostChannel) {
                // Let's connect
                hostChannel.channel = connection.uuid;
                connection.channel = hostChannel.uuid;

                console.log(`Library - Client connecting to ${channel}`);
                const webRtcConfig = getRTCConnectionConfig("client", turnExpiration, turnSecret, turnUrl);
                this.sendTo(connection, {
                    type: "client",
                    success: true,
                    message: `Client initialised ${connection.uuid}`,
                    channelId: channel,
                    webRtcConnectionConfig: webRtcConfig
                });
                if (hostChannel.origin !== "validator") {
                    hostChannel.webRtcClient.setClientChannel(connection);
                }
            } else {
                connection.close();
            }
        } else {
            console.error("Library - Not a client or host");
            connection.close();
        }
        return connection;
    }

    setupWebsocketListeners(connection: IConnectionDetails): void {
        connection.on("message", async (message) => {

            let data: IConnectionData;

            // accepting only JSON messages
            try {
                if ("utf8Data" in message) {
                    data = JSON.parse(message.utf8Data);
                }
            } catch (e) {
                console.error("Library - Websocket connection invalid JSON", e);
                data = { type: null };
            }
            const { type, offer, answer, candidate } = data;

            /**
             * Since validation happens on connection, we only expect 3 type of messages
             * In this order:
             * - Offer
             *   The host sends an offer to the client.
             * - Answer
             *   The Client response with an Answer
             * - Candidates
             *   Client/Host share candidates
             *
             * When offer and answer is send, they can start to connect over webRtc.
             * Extra candidates helps to connect faster/better
             */
            switch (type) {
                case "offer":
                    // The client sends an offer to the host.
                    if (!connection.host && connection.channel) {
                        const hostChannel: IConnectionDetails = this.wsServer.connections.find((conn: IConnectionDetails) => conn.channel === connection.uuid && conn.host === true);
                        if (hostChannel.origin === "validator") {
                            this.sendTo(hostChannel, {
                                type: "offer",
                                success: true,
                                message: "Client shared an offer",
                                offer
                            });
                        } else {
                            await hostChannel.webRtcClient.setRemoteDescription(offer);
                            await hostChannel.webRtcClient.sendAnswer();
                        }
                    } else {
                        connection.close()
                    }
                    break;
                case "answer":
                    // The host responds with an answer for the client.
                    if (connection.host && connection.channel && connection.origin === "validator") {
                        const clientChannel: IConnectionDetails = this.wsServer.connections.find((conn: IConnectionDetails) => conn.channel === connection.uuid);
                        this.sendTo(clientChannel, {
                            type: "answer",
                            success: true,
                            message: "Client shared an answer",
                            answer
                        });
                    } else {
                        connection.close()
                    }
                    break;
                case "candidate":
                    // Host and Client share candidate.
                    if (connection.channel) {
                        const channel: IConnectionDetails = this.wsServer.connections.find((conn: IConnectionDetails) => conn.channel === connection.uuid);
                        if (channel.origin === "validator" || connection.origin === "validator") {
                            this.sendTo(channel, {
                                type: "candidate",
                                success: true,
                                message: "Candidate shared",
                                candidate
                            });
                        } else {
                            channel.webRtcClient.addCandidate(candidate);
                        }
                    } else {
                        connection.close();
                    }
                    break;
                default:
                    // We can also listen to websocket events on the host so we don't want to throw any error here; custom implementation is being made on the application part
                    break;
            }
        });


        /**
         * When connection is closed
         */
        connection.on("close", (reasonCode, description) => {
            console.log(`Library - ${(new Date().toISOString())} - Peer ${connection.remoteAddress} disconnected, Reason ${reasonCode}, description ${description}`);
        });
    }
}
