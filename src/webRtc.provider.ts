import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { IWebRTCConfig } from "./interfaces/webRtcConfig.interface";
import { RTCSessionDescription, RTCIceCandidate } from "wrtc";
import { w3cwebsocket } from "websocket";

@Injectable()
export class WebRtcProvider {
    webRtcConfig: IWebRTCConfig;
    hostUuid: string; // The host UUID to connect to from the client
    peerConnection: RTCPeerConnection = null; // The peer connection between client and host
    dataChannel: RTCDataChannel = null; // The data channel between client and host
    wsClient: w3cwebsocket = null; // The websocket connection between client and signaling server or host and signaling server
    receivedActions$ = new BehaviorSubject(null); // Whenever an action is received, this observable will emit an event
    uuid$ = new BehaviorSubject<string>(null); // Whenever the UUID is set, it will emit an event (so that the host can set it somewhere in like a QR)
    websocketMessage$ = new BehaviorSubject<any>(null); // Whenever there is an event on the websocket, this observable will emit
    websocketConnectionClosed$ = new BehaviorSubject<boolean>(null); // Whenever there is an event on the websocket, this observable will emit
    websocketConnectionOpen$ = new BehaviorSubject<boolean>(null); // Whenever there is an event on the websocket, this observable will emit
    websocketConnectionError$ = new BehaviorSubject<boolean>(null); // Whenever there is an error event on the websocket, this observable will emit
    webRtcConnectionConfig: RTCConfiguration;
    connectionTimeout: NodeJS.Timeout = null;
    pongCheckInterval: NodeJS.Timeout = null;
    pingTimeout: NodeJS.Timeout = null;
    WEBSOCKET_PING_ANSWER_DELAY = 1000;
    // The allowed time before a ping pong is missing and thus disconnecting the connection
    WEBSOCKET_PING_PONG_ALLOWED_TIME = 3000;

    /**
     * Returns the WebRTC configuration
     */
    getConfig(): IWebRTCConfig {
        return this.webRtcConfig;
    }

    /**
     * The client needs to set the host UUID to connect to before setting up the websocket connection
     * @param hostUuid The UUID of the host
     */
    setHostUuid(hostUuid: string): void {
        this.hostUuid = hostUuid;
    }

    /**
     * Send data over the P2P data channel
     * @param action As a string, which action type do you want to send?
     * @param data The data to send as an object
     */
    sendP2PData(action: string, data: any): void {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.send(JSON.stringify({ action, ...data }));
        } else {
            console.error(`Websocket - Attempted to send data with action ${action} but data channel is not open`);
        }
    }

    /**
     * Send data over the data channel
     * @param action As a string, which action type do you want to send?
     * @param data The data to send as an object
     */
    sendWebsocketData(action: string, data: any): void {
        if (this.wsClient && this.wsClient.readyState === this.wsClient.OPEN) {
            this.wsClient.send(JSON.stringify({ action, ...data }));
        } else {
            console.error(`Websocket - Attempted to send data with action ${action} but websocket channel is not open`);
        }
    }

    getWebsocket(): w3cwebsocket {
        return this.wsClient;
    }

    /**
     * Whenever the UUID is set from the host this observable emits
     * @param uuid The UUID to allow clients connec to
     */
    setUuid(uuid: string): void {
        this.uuid$.next(uuid);
    }

    /**
     * Only disconnect on this application and send no disconnect over the data channel
     */
    disconnect(): void {
        clearTimeout(this.pongCheckInterval);
        clearTimeout(this.pingTimeout);
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.wsClient) {

            this.wsClient.close();
            this.wsClient.onclose = null;
        }
        this.peerConnection = null;
        this.dataChannel = null;
        this.wsClient = null;
        this.websocketConnectionClosed$.next(true);
        this.websocketConnectionOpen$.next(false);
    }

    /**
     * Disconnect on this application and send a disconnect event over the datachannel
     */
    remoteDisconnect(): void {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.send(JSON.stringify({ action: "disconnect" }));
        }
        // TODO: Is one second enough?
        setTimeout(() => {
            this.disconnect();
        }, 1000)
    }

    /**
     * The host will send an offer when a client connects to his UUID
     * @param peerConnection The peer connection to set the local description
     * @param wsClient The websocket to send the offer to
     */
    async sendOffer(peerConnection: RTCPeerConnection, wsClient: w3cwebsocket): Promise<void> {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        wsClient.send(JSON.stringify({
            type: "offer",
            offer
        }));
    }

    /**
     * This method will launch the websocket and listen to events
     */
    async launchWebsocketClient(webRtcConfig: IWebRTCConfig): Promise<void> {
        this.webRtcConfig = webRtcConfig;

        let connectionSuccess = null;
        this.receivedActions$ = new BehaviorSubject(null);
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }
        this.uuid$ = new BehaviorSubject(null);
        this.websocketMessage$ = new BehaviorSubject(null);
        this.websocketConnectionClosed$ = new BehaviorSubject(null);
        this.websocketConnectionOpen$ = new BehaviorSubject(null);
        this.websocketConnectionError$ = new BehaviorSubject(null);

        let signalingUrl = this.webRtcConfig.signalingUrl;
        if (!signalingUrl) {
            console.log("Launch websocket - URL undefined, falling back to default");
            signalingUrl = "wss://auth.proofme.id";
        }
        console.log("Launch websocket - Client URL:", signalingUrl);
        console.log("Launch websocket - Channel:", webRtcConfig.channel);
        let url = `${signalingUrl}?channel=${webRtcConfig.channel}`;
        if (webRtcConfig.data) {
            url = `${url}&data=${webRtcConfig.data}`;
        }
        this.wsClient = new w3cwebsocket(url);
        // So if there is not a success connection after 10 seconds, close the socket and send an error
        this.connectionTimeout = setTimeout(() => {
            if (connectionSuccess !== true) {
                this.websocketConnectionError$.next(true);
                this.wsClient.close();
            }
        }, 10000);
        this.wsClient.onerror = (error => {
            console.log("Websocket - Error: " + error.toString());
            connectionSuccess = false;
            this.websocketConnectionClosed$.next(true);
            this.websocketConnectionOpen$.next(false);
            this.websocketConnectionError$.next(true);
        });
        this.wsClient.onclose = (() => {
            console.log("Websocket - Connection closed");
            this.websocketConnectionClosed$.next(true);
            this.websocketConnectionOpen$.next(false);
        });
        this.wsClient.onopen = (() => {
            console.log("Websocket - Connection open");
            connectionSuccess = true;
            this.websocketConnectionClosed$.next(false);
            this.websocketConnectionOpen$.next(true);
        });
        this.wsClient.onmessage = (async msg => {
            console.log("Websocket - Message:", msg);
            this.websocketMessage$.next(msg);
            if (msg.data) {

                let data: any;
                // accepting only JSON messages
                try {
                    data = JSON.parse(msg.data as string);
                } catch (e) {
                    console.error("Websocket - Message was not JSON");
                    data = {};
                }
                const { type, message, success, uuid, offer, answer, candidate, webRtcConnectionConfig } = data;

                switch (type) {
                    case "error":
                        // On an error
                        console.log("Websocket - Error message:", message);
                        if (message == "Command not found: ping") {
                            clearTimeout(this.pongCheckInterval);
                            this.pongCheckInterval = setTimeout(() => {
                                console.log(`Websocket - Ping pong took more than ${this.WEBSOCKET_PING_PONG_ALLOWED_TIME}ms. Disconnecting`);
                                this.disconnect();
                            }, this.WEBSOCKET_PING_PONG_ALLOWED_TIME);
                            this.sendPing();
                        }
                        break;
                    case "connect":
                        // When connected to the Signaling service
                        if (success) {
                            if (this.webRtcConfig.isHost) {
                                const maxTries = 500;
                                let tries = 0;
                                const interval = setInterval(() => {
                                    if (!this.wsClient) {
                                        clearInterval(interval);
                                    }
                                    if (this.wsClient && this.wsClient.readyState === 1 && tries < maxTries) {
                                        clearInterval(interval);
                                        // if the application is the host, send a host request to receive a UUID
                                        this.wsClient.send(JSON.stringify({ type: "host" }));
                                    }
                                    if (tries >= maxTries) {
                                        clearInterval(interval);
                                    }
                                    tries++;
                                }, 50)
                            } else {
                                const maxTries = 500;
                                let tries = 0;
                                const interval = setInterval(async () => {
                                    if (!this.wsClient) {
                                        clearInterval(interval);
                                    }
                                    if (this.wsClient && this.wsClient.readyState === 1 && tries < maxTries) {
                                        clearInterval(interval);
                                        // If the application is not the host, send a connect request with the host UUID
                                        this.wsClient.send(JSON.stringify({ type: "connect", host: this.hostUuid }));
                                    }
                                    if (tries >= maxTries) {
                                        clearInterval(interval);
                                    }
                                    tries++;
                                }, 50)
                            }
                        }
                        break;
                    case "connected":
                        // We successfully connected so no need to check on the ping pong anymore
                        clearTimeout(this.pongCheckInterval);
                        clearTimeout(this.pingTimeout);
                        if (webRtcConnectionConfig) {
                            this.webRtcConnectionConfig = webRtcConnectionConfig;
                            if (!this.webRtcConfig.isHost) {
                                await this.setupPeerconnection(this.hostUuid);
                            }
                        }
                        // When the host received an UUID
                        if (uuid && this.webRtcConfig.isHost) {
                            await this.sendOffer(this.peerConnection, this.wsClient);
                        }
                        break;
                    case "pong":
                        clearTimeout(this.pongCheckInterval);
                        this.pongCheckInterval = setTimeout(() => {
                            this.disconnect();
                        }, this.WEBSOCKET_PING_PONG_ALLOWED_TIME);
                        this.sendPing();
                        break;
                    case "offer":
                        // If the application is not the host, it receives an offer whenever a client connects.
                        // The client will send an answer back
                        if (offer && !this.webRtcConfig.isHost) {
                            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                            const hostAnswer = await this.peerConnection.createAnswer();
                            await this.peerConnection.setLocalDescription(hostAnswer);
                            this.wsClient.send(JSON.stringify({
                                type: "answer",
                                answer: hostAnswer
                            }));
                        }
                        break;
                    case "host":
                        // Whenever the host receives a host request back, set the UUID provided
                        if (uuid && this.webRtcConfig.isHost) {
                            this.setUuid(uuid);
                            if (webRtcConnectionConfig) {
                                this.webRtcConnectionConfig = webRtcConnectionConfig;
                            }
                            await this.setupPeerconnection(uuid);
                            this.sendPing();
                        }
                        break;
                    case "leave":
                        // Whenever the host or client leaves setup a new connection
                        this.setUuid(null);
                        this.disconnect();
                        break;
                    case "answer":
                        // The client will send an answer and the host will set it as a description
                        if (answer) {
                            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                        }
                        break;
                    case "candidate":
                        // On receiving an candidate from the client
                        if (candidate) {
                            const clientCandidate = new RTCIceCandidate(candidate);
                            await this.peerConnection.addIceCandidate(clientCandidate);
                        }
                        break;
                    case "client":
                        if (webRtcConnectionConfig) {
                            this.webRtcConnectionConfig = webRtcConnectionConfig;
                            if (!this.webRtcConfig.isHost) {
                                await this.setupPeerconnection(this.hostUuid);
                                await this.sendOffer(this.peerConnection, this.wsClient);
                            }
                        }
                        break;
                    default:
                        // The default
                        // console.error("Websocket onmessage default");
                        break;
                }
            }
        });
    }

    sendPing(): void {
        this.pingTimeout = setTimeout(() => {
            // Ready state 1 = open
            if (this.wsClient.readyState === 1) {
                this.wsClient.send(JSON.stringify({
                    type: "ping"
                }));
            }
        }, this.WEBSOCKET_PING_ANSWER_DELAY);
    }

    /**
     * This method will setup the peerconnection and datachannel
     * It will also emit received actions over an observable
     * @param uuid The UUID to connect to
     */
    async setupPeerconnection(uuid: string): Promise<void> {
        this.peerConnection = new RTCPeerConnection(this.webRtcConnectionConfig);
        this.dataChannel = this.peerConnection.createDataChannel(uuid);

        this.peerConnection.addEventListener("datachannel", event => {
            event.channel.onmessage = (async eventMessage => {
                let data: any;

                // accepting only JSON messages
                try {
                    data = JSON.parse(eventMessage.data);
                    // By default this class will only handle the disconnect event. Close the websocket on this side.
                    switch (data.action) {
                        case "disconnect":
                            this.disconnect();
                            break;
                    }
                    this.receivedActions$.next(data);
                } catch (error) {
                    console.log("P2P - Message invalid JSON:", error);
                }
            });
            event.channel.onopen = () => {
                this.receivedActions$.next({ action: "p2pConnected", p2pConnected: true });
                this.wsClient.close();
            };
        });

        this.peerConnection.addEventListener("iceconnectionstatechange", event => {
            if (this.peerConnection.iceConnectionState === "disconnected") {
                this.receivedActions$.next({ action: "p2pConnected", p2pConnected: false });
                this.peerConnection.close();
                this.wsClient.send(JSON.stringify({ type: "leave" }));
                this.wsClient.close();
            }
        });

        this.peerConnection.addEventListener("icecandidate", async event => {
            if (event.candidate) {
                try {
                    const candidate = new RTCIceCandidate(event.candidate);
                    await this.peerConnection.addIceCandidate(candidate);
                } catch (error) {
                    console.error("P2P - Error adding candidate:", error);
                }
                this.wsClient.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
            }
        });
    }

    /**
     * This method will setup the peerconnection and datachannel
     * It will also emit received actions over an observable
     * @param uuid The UUID to connect to
     */
    async setupClientPeerconnection(): Promise<void> {

        this.peerConnection = new RTCPeerConnection(this.webRtcConnectionConfig);
        // this.dataChannel = this.peerConnection.createDataChannel(uuid);

        this.peerConnection.addEventListener("datachannel", event => {
            event.channel.onmessage = (async eventMessage => {
                let data: any;

                // accepting only JSON messages
                try {
                    data = JSON.parse(eventMessage.data);
                    // By default this class will only handle the disconnect event. Close the websocket on this side.
                    switch (data.action) {
                        case "disconnect":
                            this.disconnect();
                            break;
                    }
                    this.receivedActions$.next(data);
                } catch (error) {
                    console.log("P2P - Message invalid JSON:", error);
                }
            });
            event.channel.onopen = () => {
                this.receivedActions$.next({ action: "p2pConnected", p2pConnected: true });
                this.wsClient.close();
            };
        });

        this.peerConnection.addEventListener("iceconnectionstatechange", event => {
            if (this.peerConnection.iceConnectionState === "disconnected") {
                this.receivedActions$.next({ action: "p2pConnected", p2pConnected: false });
                this.peerConnection.close();
                this.wsClient.send(JSON.stringify({ type: "leave" }));
                this.wsClient.close();
            }
        });

        this.peerConnection.addEventListener("icecandidate", async event => {
            if (event.candidate) {
                try {
                    const candidate = new RTCIceCandidate(event.candidate);
                    await this.peerConnection.addIceCandidate(candidate);
                } catch (error) {
                    console.error("P2P - Error adding candidate:", error);
                }
                this.wsClient.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
            }
        });
    }
}
