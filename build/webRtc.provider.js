"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebRtcProvider = void 0;
const core_1 = require("@angular/core");
const rxjs_1 = require("rxjs");
const wrtc_1 = require("wrtc");
const websocket_1 = require("websocket");
let WebRtcProvider = class WebRtcProvider {
    constructor() {
        this.peerConnection = null; // The peer connection between client and host
        this.dataChannel = null; // The data channel between client and host
        this.wsClient = null; // The websocket connection between client and signaling server or host and signaling server
        this.receivedActions$ = new rxjs_1.BehaviorSubject(null); // Whenever an action is received, this observable will emit an event
        this.uuid$ = new rxjs_1.BehaviorSubject(null); // Whenever the UUID is set, it will emit an event (so that the host can set it somewhere in like a QR)
        this.websocketMessage$ = new rxjs_1.BehaviorSubject(null); // Whenever there is an event on the websocket, this observable will emit
        this.websocketConnectionClosed$ = new rxjs_1.BehaviorSubject(null); // Whenever there is an event on the websocket, this observable will emit
        this.websocketConnectionOpen$ = new rxjs_1.BehaviorSubject(null); // Whenever there is an event on the websocket, this observable will emit
        this.websocketConnectionError$ = new rxjs_1.BehaviorSubject(null); // Whenever there is an error event on the websocket, this observable will emit
        this.connectionTimeout = null;
        this.pongCheckInterval = null;
        this.pingTimeout = null;
        this.WEBSOCKET_PING_ANSWER_DELAY = 1000;
        // The allowed time before a ping pong is missing and thus disconnecting the connection
        this.WEBSOCKET_PING_PONG_ALLOWED_TIME = 3000;
    }
    /**
     * Returns the WebRTC configuration
     */
    getConfig() {
        return this.webRtcConfig;
    }
    /**
     * The client needs to set the host UUID to connect to before setting up the websocket connection
     * @param hostUuid The UUID of the host
     */
    setHostUuid(hostUuid) {
        this.hostUuid = hostUuid;
    }
    /**
     * Send data over the P2P data channel
     * @param action As a string, which action type do you want to send?
     * @param data The data to send as an object
     */
    sendP2PData(action, data) {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            console.log(`Library - Sending action '${action}'`);
            this.dataChannel.send(JSON.stringify(Object.assign({ action }, data)));
        }
        else {
            console.error(`Websocket - Attempted to send data with action ${action} but data channel is not open`);
        }
    }
    /**
     * Send data over the data channel
     * @param action As a string, which action type do you want to send?
     * @param data The data to send as an object
     */
    sendWebsocketData(action, data) {
        if (this.wsClient && this.wsClient.readyState === this.wsClient.OPEN) {
            this.wsClient.send(JSON.stringify(Object.assign({ action }, data)));
            return true;
        }
        else {
            console.error(`Websocket - Attempted to send data with action ${action} but websocket channel is not open`);
            return false;
        }
    }
    getWebsocket() {
        return this.wsClient;
    }
    /**
     * Whenever the UUID is set from the host this observable emits
     * @param uuid The UUID to allow clients connec to
     */
    setUuid(uuid) {
        this.uuid$.next(uuid);
    }
    /**
     * Only disconnect on this application and send no disconnect over the data channel
     */
    disconnect() {
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
    remoteDisconnect() {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.send(JSON.stringify({ action: "disconnect" }));
        }
        // TODO: Is one second enough?
        setTimeout(() => {
            this.disconnect();
        }, 1000);
    }
    /**
     * The host will send an offer when a client connects to his UUID
     * @param peerConnection The peer connection to set the local description
     * @param wsClient The websocket to send the offer to
     */
    sendOffer(peerConnection, wsClient) {
        return __awaiter(this, void 0, void 0, function* () {
            const offer = yield peerConnection.createOffer();
            yield peerConnection.setLocalDescription(offer);
            wsClient.send(JSON.stringify({
                type: "offer",
                offer
            }));
        });
    }
    /**
     * This method will launch the websocket and listen to events
     */
    launchWebsocketClient(webRtcConfig, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            this.webRtcConfig = webRtcConfig;
            let connectionSuccess = null;
            this.receivedActions$ = new rxjs_1.BehaviorSubject(null);
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
            }
            this.uuid$ = new rxjs_1.BehaviorSubject(null);
            this.websocketMessage$ = new rxjs_1.BehaviorSubject(null);
            this.websocketConnectionClosed$ = new rxjs_1.BehaviorSubject(null);
            this.websocketConnectionOpen$ = new rxjs_1.BehaviorSubject(null);
            this.websocketConnectionError$ = new rxjs_1.BehaviorSubject(null);
            let signalingUrl = this.webRtcConfig.signalingUrl;
            if (!signalingUrl) {
                console.log("Launch websocket - URL undefined, falling back to default");
                signalingUrl = "wss://auth.proofme.id";
            }
            console.log("Launch websocket - Client URL:", signalingUrl);
            console.log("Launch websocket - Channel:", webRtcConfig.channel);
            console.log("Launch websocket - Headers:", headers);
            let url = null;
            // If it already has queries, append
            if (signalingUrl.includes("?")) {
                url = `${signalingUrl}&channel=${webRtcConfig.channel}`;
                // If it does not yet have queries, start with it
            }
            else {
                url = `${signalingUrl}?channel=${webRtcConfig.channel}`;
            }
            if (webRtcConfig.data) {
                url = `${url}&data=${webRtcConfig.data}`;
            }
            if (webRtcConfig.keepalive) {
                url = `${url}&keepalive=${webRtcConfig.keepalive}`;
            }
            this.wsClient = new websocket_1.w3cwebsocket(url, null, null, headers);
            // So if there is not a success connection after 10 seconds, close the socket and send an error
            this.connectionTimeout = setTimeout(() => {
                if (connectionSuccess !== true) {
                    this.websocketConnectionError$.next(true);
                    if (this.wsClient) {
                        this.wsClient.close();
                    }
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
            this.wsClient.onmessage = ((msg) => __awaiter(this, void 0, void 0, function* () {
                console.log("Websocket - Message:", msg);
                this.websocketMessage$.next(msg);
                if (msg.data) {
                    let data;
                    // accepting only JSON messages
                    try {
                        data = JSON.parse(msg.data);
                    }
                    catch (e) {
                        console.error("Websocket - Message was not JSON");
                        data = {};
                    }
                    const { type, message, success, channelId, offer, answer, candidate, webRtcConnectionConfig } = data;
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
                                    }, 50);
                                }
                                else {
                                    const maxTries = 500;
                                    let tries = 0;
                                    const interval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
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
                                    }), 50);
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
                                    yield this.setupPeerconnection(this.hostUuid);
                                }
                            }
                            // When the host received an UUID
                            if (channelId && this.webRtcConfig.isHost) {
                                yield this.sendOffer(this.peerConnection, this.wsClient);
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
                            if (offer) {
                                yield this.peerConnection.setRemoteDescription(new wrtc_1.RTCSessionDescription(offer));
                                const hostAnswer = yield this.peerConnection.createAnswer();
                                yield this.peerConnection.setLocalDescription(hostAnswer);
                                this.wsClient.send(JSON.stringify({
                                    type: "answer",
                                    answer: hostAnswer
                                }));
                            }
                            break;
                        case "host":
                            // Whenever the host receives a host request back, set the UUID provided
                            if (channelId && this.webRtcConfig.isHost) {
                                this.setUuid(channelId);
                                if (webRtcConnectionConfig) {
                                    this.webRtcConnectionConfig = webRtcConnectionConfig;
                                }
                                yield this.setupPeerconnection(channelId);
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
                                yield this.peerConnection.setRemoteDescription(new wrtc_1.RTCSessionDescription(answer));
                            }
                            break;
                        case "candidate":
                            // On receiving an candidate from the client
                            if (candidate) {
                                const clientCandidate = new wrtc_1.RTCIceCandidate(candidate);
                                yield this.peerConnection.addIceCandidate(clientCandidate);
                            }
                            break;
                        case "client":
                            if (webRtcConnectionConfig) {
                                this.webRtcConnectionConfig = webRtcConnectionConfig;
                                if (!this.webRtcConfig.isHost) {
                                    yield this.setupPeerconnection(this.hostUuid);
                                    yield this.sendOffer(this.peerConnection, this.wsClient);
                                }
                            }
                            break;
                        default:
                            // The default
                            // console.error("Websocket onmessage default");
                            break;
                    }
                }
            }));
        });
    }
    sendPing() {
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
    setupPeerconnection(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            this.peerConnection = new RTCPeerConnection(this.webRtcConnectionConfig);
            this.dataChannel = this.peerConnection.createDataChannel(uuid);
            this.peerConnection.addEventListener("datachannel", event => {
                event.channel.onmessage = ((eventMessage) => __awaiter(this, void 0, void 0, function* () {
                    let data;
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
                    }
                    catch (error) {
                        console.log("P2P - Message invalid JSON:", error);
                    }
                }));
                event.channel.onopen = () => {
                    this.receivedActions$.next({ action: "p2pConnected", p2pConnected: true });
                    this.sendP2PData("clientconnected", { success: true });
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
            this.peerConnection.addEventListener("icecandidate", (event) => __awaiter(this, void 0, void 0, function* () {
                if (event.candidate) {
                    try {
                        const candidate = new wrtc_1.RTCIceCandidate(event.candidate);
                        yield this.peerConnection.addIceCandidate(candidate);
                    }
                    catch (error) {
                        // Silence error because it cannot add itself, it will send over websocket
                    }
                    this.wsClient.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
                }
            }));
        });
    }
    /**
     * This method will setup the peerconnection and datachannel
     * It will also emit received actions over an observable
     * @param uuid The UUID to connect to
     */
    setupClientPeerconnection() {
        return __awaiter(this, void 0, void 0, function* () {
            this.peerConnection = new RTCPeerConnection(this.webRtcConnectionConfig);
            this.peerConnection.addEventListener("datachannel", event => {
                event.channel.onmessage = ((eventMessage) => __awaiter(this, void 0, void 0, function* () {
                    let data;
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
                    }
                    catch (error) {
                        console.log("P2P - Message invalid JSON:", error);
                    }
                }));
                event.channel.onopen = () => {
                    this.receivedActions$.next({ action: "p2pConnected", p2pConnected: true });
                    this.sendP2PData("clientconnected", { success: true });
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
            this.peerConnection.addEventListener("icecandidate", (event) => __awaiter(this, void 0, void 0, function* () {
                if (event.candidate) {
                    try {
                        const candidate = new wrtc_1.RTCIceCandidate(event.candidate);
                        yield this.peerConnection.addIceCandidate(candidate);
                    }
                    catch (error) {
                        // Silence error because it cannot add itself, it will send over websocket
                    }
                    this.wsClient.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
                }
            }));
        });
    }
};
WebRtcProvider = __decorate([
    (0, core_1.Injectable)()
], WebRtcProvider);
exports.WebRtcProvider = WebRtcProvider;
//# sourceMappingURL=webRtc.provider.js.map