import { Subject } from "rxjs";
import { RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCDataChannel } from "wrtc";
import { IConnectionDetails } from "./interfaces/connectionDetails";
import { IRequestedCredentials } from "./interfaces/requestedCredentials.interface";

export class WebRTCClientV2 {

    peerConnection: RTCPeerConnection = null;
    dataChannel: RTCDataChannel = null;
    clientChannel: IConnectionDetails;
    webRtcConnectionConfig: RTCConfiguration;
    requestedCredentials: IRequestedCredentials;
    hostWsConnection: IConnectionDetails;
    actionType: string;
    dataChannelOpen$ = new Subject<void>();
    dataChannelMessage$ = new Subject<any>();
    data: any;

    constructor(
        webRtcConnectionConfig: RTCConfiguration,
        requestedCredentials: IRequestedCredentials,
        hostWsConnection: IConnectionDetails,
        actionType: string,
        data: any
    ) {
        this.webRtcConnectionConfig = webRtcConnectionConfig;
        this.requestedCredentials = requestedCredentials;
        this.hostWsConnection = hostWsConnection;
        this.actionType = actionType;
        this.data = data;
    }

    /**
     * This method will setup the peerconnection and datachannel
     * It will also emit received actions over an observable
     * @param uuid The UUID to connect to
     */
    async setupPeerconnection(channelUuid: string): Promise<void> {
        this.peerConnection = new RTCPeerConnection(this.webRtcConnectionConfig);
        this.dataChannel = this.peerConnection.createDataChannel(channelUuid);

        this.peerConnection.addEventListener("icecandidate", async event => {
            if (event.candidate) {
                try {
                    const candidate = new RTCIceCandidate(event.candidate);
                    await this.peerConnection.addIceCandidate(candidate);
                } catch (e) {
                    // Silence this error. A lot of candidates can't be added and thats fine; that's why we have multiple candidates
                }
                this.clientChannel.sendUTF(JSON.stringify({ type: "candidate", candidate: event.candidate }));
            }
        });

        this.peerConnection.addEventListener("iceconnectionstatechange", () => {
            if (this.peerConnection.iceConnectionState === "disconnected") {
                this.peerConnection.close();
            }
        });

        this.peerConnection.addEventListener("datachannel", dataChannelEvent => {
            dataChannelEvent.channel.onmessage = (async messageEvent => {
                try {
                    const parsedMessage = JSON.parse(messageEvent.data);

                    this.dataChannelMessage$.next(parsedMessage);
                } catch (error) {
                    console.error("Could not parse message:", error);
                }
            })

            dataChannelEvent.channel.onopen = async () => {
                console.log("Library - Datachannel connected");
                this.hostWsConnection.sendUTF(JSON.stringify({
                    type: "clientconnected",
                    success: true
                }));

                this.dataChannelOpen$.next();
            };

            dataChannelEvent.channel.onclose = (data) => {
                console.log("Library - Datachannel onclose:", data);
                this.hostWsConnection.sendUTF(JSON.stringify({
                    type: "disconnect"
                }));
            };
        });
    }

    /**
     * The host will send an offer when a client connects to his UUID
     */
    async sendOffer(): Promise<void> {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.clientChannel.sendUTF(JSON.stringify({
            type: "offer",
            offer
        }));
    }

    /**
     * Send data over the data channel
     * @param action As a string, which action type do you want to send?
     * @param data The data to send as an object
     */
     sendP2PData(action: string, data: any): void {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            console.log(`Library - Sending action '${action}' with data:`, data);
            this.dataChannel.send(JSON.stringify({ action, ...data }));
        } else {
            console.error(`Library - Attempted to send data with action ${action} but data channel is not open`);
        }
    }

    /**
     * Sets the remote description of the other side
     * @param remoteDescription Can be offer or answer depending on the client / host
     */
    async setRemoteDescription(remoteDescription: string): Promise<void> {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDescription));
    }

    async addCandidate(candidate: string): Promise<void> {
        try {
            const clientCandidate = new RTCIceCandidate(candidate);
            await this.peerConnection.addIceCandidate(clientCandidate);
        } catch (error) {
            console.error(error);
        }
    }

    async sendAnswer(): Promise<void> {
        const hostAnswer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(hostAnswer);
        this.clientChannel.sendUTF(JSON.stringify({
            type: "answer",
            answer: hostAnswer
        }));
    }

    setClientChannel(channel: IConnectionDetails): void {
        this.clientChannel = channel;
    }
}
