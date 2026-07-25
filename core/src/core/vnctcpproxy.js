const net = require('net');

class WebSocket {
    CONNECTING = "connecting"
    OPEN = "open"
    CLOSING = "closing"
    CLOSED = "closed"

    constructor(uri, protocol) {
        const {hostname, port} = new URL(uri);
        this._socket = new net.Socket();
        this._init();
        this._socket.connect(port, hostname);
    }

    _init() {
        this._binaryType = null;
        this._onerror = null;
        this._onmessage = null;
        this._onopen = null;
        this._onclose = null;
        this._socket.on("connect", () => {
            this._onopen && this._onopen();
        })

        this._socket.on("data", (d) => {
            this._onmessage && this._onmessage({data: d});
        })

        this._socket.on("close", (hadError)=> {
            this._onclose && this._onclose({code: hadError});
        })

        this._socket.on("error", (error)=> {
            this._onerror && this._onerror(error);
        })
    }

    get readyState() {
        const state = this._socket.readyState;
        if(state === "opening") {
            return this.CONNECTING;
        } else if(state === "open") {
            return this.OPEN;
        } else if((state === "readOnly") || (state === "writeOnly")) {
            return this.CLOSING;
        } else {
            return this.CLOSED;
        }
    }

    set binaryType(v) {
        this._binaryType = v;
    }

    get binaryType() {
        return this._binaryType;
    }

    set onerror(f) {
        this._onerror = f;
    }

    set onmessage(f) {
        this._onmessage = f;
    }

    set onopen(f) {
        this._onopen = f;
    }

    set onclose(f) {
        this._onclose = f;
    }

    get protocol() {
        return "tcpproxy"
    }

    send(b) {
        this._socket.write(b)
    }

    close() {

    }

}


module.exports = WebSocket;