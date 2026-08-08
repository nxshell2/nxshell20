import * as net from 'net';

class WebSocket {
  CONNECTING = "connecting";
  OPEN = "open";
  CLOSING = "closing";
  CLOSED = "closed";

  _socket: net.Socket;
  _binaryType: string | null = null;
  _onerror: ((error: any) => void) | null = null;
  _onmessage: ((event: { data: Buffer }) => void) | null = null;
  _onopen: (() => void) | null = null;
  _onclose: ((event: { code: boolean }) => void) | null = null;

  constructor(uri: string, protocol?: string) {
    const { hostname, port } = new URL(uri);
    this._socket = new net.Socket();
    this._init();
    this._socket.connect(parseInt(port), hostname);
  }

  _init() {
    this._socket.on("connect", () => {
      this._onopen && this._onopen();
    });

    this._socket.on("data", (d: Buffer) => {
      this._onmessage && this._onmessage({ data: d });
    });

    this._socket.on("close", (hadError: boolean) => {
      this._onclose && this._onclose({ code: hadError });
    });

    this._socket.on("error", (error: any) => {
      this._onerror && this._onerror(error);
    });
  }

  get readyState(): string {
    const state = this._socket.readyState;
    if (state === "opening") {
      return this.CONNECTING;
    } else if (state === "open") {
      return this.OPEN;
    } else if (state === "readOnly" || state === "writeOnly") {
      return this.CLOSING;
    } else {
      return this.CLOSED;
    }
  }

  set binaryType(v: string | null) {
    this._binaryType = v;
  }

  get binaryType(): string | null {
    return this._binaryType;
  }

  set onerror(f: ((error: any) => void) | null) {
    this._onerror = f;
  }

  set onmessage(f: ((event: { data: Buffer }) => void) | null) {
    this._onmessage = f;
  }

  set onopen(f: (() => void) | null) {
    this._onopen = f;
  }

  set onclose(f: ((event: { code: boolean }) => void) | null) {
    this._onclose = f;
  }

  get protocol(): string {
    return "tcpproxy";
  }

  send(b: any) {
    this._socket.write(b);
  }

  close() {
  }
}

export default WebSocket;
