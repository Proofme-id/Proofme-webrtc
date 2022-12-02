export const enum EWebsocketReadyState {
    /** Socket has been created. The connection is not yet open. */
    CONNECTING,
    /** The connection is open and ready to communicate. */
    OPEN,
    /** The connection is in the process of closing. */
    CLOSING,
    /** The connection is closed or couldn't be opened. */
    CLOSED
}