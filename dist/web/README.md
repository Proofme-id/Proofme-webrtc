## Proofme.ID - WebRTC

This package allows easy usage of the WebRTC part as of a lot of utilty functions to check credentials and validity of those

# Web version

# Step 1: Importing the package

Import the package

```
import { WebRtcProvider } from "@proofmeid/webrtc-web";
```

Inject it inside the constructor

```
constructor(
    private webRtcProvider: WebRtcProvider
) {
```

And... ready to use!

# Step 2: Setting up a websocket connection to initiate a P2P (WebRTC) connection

Call the method 'launchWebsocketClient' to launch a websocket to receive messages on. 

- Argument 1 signalingUrl: The URL to setup the signaling server websocket connection to (by default "wss://auth.proofme.id")
- Argument 2 isHost: When receiving connections, set to true. When being a client (wanting to connect), set to false

```
this.webRtcProvider.launchWebsocketClient({
    signalingUrl: environment.signalingUrl,
    isHost: true
});
```

And that's all. The library handles all of the difficult WebRTC parts

# Step 3: Create a QR code for the client to scan (to setup the P2P connection)

There are several observables to listen on, one of them is the 'uuid'. It is the channel on which this host will receive connections to. To make it easily accesible, set the uuid in a QR so the client can scan it. In this example we use the 'qrcode' library which is publicly available on npm (https://www.npmjs.com/package/qrcode)

```
this.webRtcProvider.uuid$.subscribe((uuid: string) => {
    const canvas = this.qrCodeCanvas.nativeElement as HTMLCanvasElement;
    QRCode.toCanvas(canvas, `p2p:${uuid}`, {
        width: 250,
        errorCorrectionLevel: "high",
    });
});
```

Now this makes the QR code available for the client to scan, when the client (Mobile Proofme App) scans the QR code, it will connect automatically, the websocket connection gets closed and the P2P connection is being setup. Now we can do all sorts of communications.

# Step 4: Register listen events and communicate between host and client through the P2P connection

Receive actions (messages send by client) through this observable
```
this.webRtcProvider.receivedActions$.subscribe
```

Listen to a close event (when client disconnects) on the connection through this oberservable
```
this.webRtcProvider.websocketConnectionClosed$.subscribe
```

# Step 5: Send data to the client

There are several actions available (login, identify are the most commonly used)

```
const timestamp = new Date();
const requestedData: IRequestedCredentials = {
    by: "Proofme",
    description: "full identification",
    credentials: [
        { key: "PHOTO", provider: "EPASS", required: true },
        { key: "FIRST_NAME", provider: "EPASS", required: true },
        { key: "LAST_NAME", provider: "EPASS", required: true },
        { key: "BIRTH_DATE", provider: "EPASS", required: true },
        { key: "GENDER", provider: "EPASS", required: true },
        { key: "NATIONALITY", provider: "EPASS", required: true },
        { key: "DOCUMENT_NUMBER", provider: "EPASS", required: true },
        { key: "DOCUMENT_EXPIRY_DATE", provider: "EPASS", required: true },
        { key: "DOCUMENT_TYPE", provider: "EPASS", required: true }
    ]
};
this.webRtcProvider.sendData("identify", {
    request: requestedData,
    timestamp
});
```

This will send a request to the Proofme App to share certain credentials

- Key 'by': This is what the user sees to identify to
- Key 'description': This is what the user sees as subtitle
- Key 'credentials': This is a list of requested credentials to identify with
- Subkey 'key': The credential key to request
- Subkey 'provider': The provider of the requested credential (EPASS, EMAIL, PHONE_NUMBER)
- Subkey 'required': Pass true for required and false for optional (the user may skip optional credentials)

