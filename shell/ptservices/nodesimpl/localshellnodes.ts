import * as os from 'os';

let pty: any = null;
try {
    pty = require('node-pty');
} catch (e) {
    console.log('node pty load failed', e);
}

const shell = (() => {
    let platform = os.platform();
    if (platform === 'win32') {
        return 'powershell.exe';
    } else if (platform === 'darwin') {
        return 'zsh';
    } else {
        return 'bash';
    }
})();

import { NXTERMINAL_EVENTS, NxTerminal } from "../../common/nxsys/terminal";
import { PROTOCOLS, PROTOCOL_CAPS_MAP } from "../../common/nxsys/consts";
import { register } from "./registry";
import { createObjectHandle, closeObject } from "../nxobjs";
import { NxNodeServer } from "./node";

declare const powertools: any;

class LocalShellTerminal extends NxTerminal {
    parent: any = null;
    shellStrem: any = null;
    connId: number = -1;
    wait_bind_msg_queue: any[] = [];
    channel: any = null;

    constructor(parent: any, connId: number) {
        super();
        this.parent = parent;
        this.connId = connId;
    }

    async init() {
        let conn = this.parent.refConnection(this.connId);
        return await new Promise((resolve, reject) => {
            this.shellStrem = conn;
            conn.on("exit", () => {
                this.emit(NXTERMINAL_EVENTS.CLOSE);
            });
            conn.on("data", (data: any) => {
                this._write_channel(data);
            });
            this._write_channel(Buffer.from('Connected'));
            resolve(true);
        });
    }

    _write_channel(data: any) {
        if (this.channel) {
            this.channel.send(data);
        } else {
            this.wait_bind_msg_queue.push(data);
        }
    }

    async getConnId() {
        if (this.connId !== -1) {
            return this.connId;
        } else {
            throw new Error('LocalShell terminal conn id not exist');
        }
    }

    async bindDataChannel(channelId: number) {
        this.channel = powertools.bindHsIPCChannelById(channelId);
        this.channel.on('data', (d: any) => {
            this.sendData(d);
        });
        if (this.wait_bind_msg_queue.length) {
            this.wait_bind_msg_queue.forEach((ele) => {
                this.channel.send(ele);
            });
        }
        this.wait_bind_msg_queue = [];
    }

    async sendData(data: any) {
        if (this.shellStrem) {
            this.shellStrem.write(data);
        }
    }

    async setWindowSize(cols: number, rows: number) {
        this.shellStrem.resize(cols, rows);
    }

    async openTunnel() {
        throw new Error("Telnet no support tunnel");
    }

    async close() {
        if (this.shellStrem) {
            this.shellStrem = null;
            this.parent.closeConnection(this.connId);
        }
    }

    async dispose() {
        await this.close();
        this.shellStrem = null;
        this.emit("dispose");
        this.removeAllListeners();
    }
}

class LocalShellNodes extends NxNodeServer {
    caps: number = PROTOCOL_CAPS_MAP.LOCALSHELL;
    initialized: any = null;
    openedHandlers: number[] = [];
    fsHandlers: number[] = [];

    constructor(uuid: string, connProtocol: string, sessionConfig: any) {
        super(uuid, connProtocol, sessionConfig);
    }

    async _createConnection() {
        const shellType = this.config?.shellType;
        let shell = shellType;
        if (!shell) {
            const platform = os.platform();
            if (platform === 'win32') {
                shell = 'powershell.exe';
            } else if (platform === 'darwin') {
                shell = 'zsh';
            } else {
                shell = 'bash';
            }
        }
        const ptyProcess = pty.spawn(shell, [], {
            cols: 150,
            rows: 50,
            cwd: os.homedir(),
            env: process.env
        });
        return ptyProcess;
    }

    _closeConnection(conn: any) {
        conn.kill();
    }

    async init() {
    }

    _removeOpenedHandler(handler: number) {
        const idx = this.openedHandlers.findIndex(val => val === handler);
        if (idx > -1) {
            this.openedHandlers.splice(idx, 1);
        }
    }

    async _prepareConnection(reuseConnId: number): Promise<number> {
        let connId = reuseConnId;
        if (reuseConnId === -1) {
            connId = await this.createConnection();
        } else {
            throw new Error("LocalShell session no support duplicate");
        }
        return connId;
    }

    async getTerminalInstance(reuseConnId: number = -1): Promise<number> {
        reuseConnId = -1;
        let connId = await this._prepareConnection(reuseConnId);
        const terminal = new LocalShellTerminal(this, connId);
        const handler = createObjectHandle(terminal);
        this.openedHandlers.push(handler);
        terminal.once("dispose", () => {
            this._removeOpenedHandler(handler);
        });
        return handler;
    }

    async getFSInstance(reuseConnId: number = -1) {}
    async getNetInstance(reuseConnId: number = -1) {}
    async getGUIInstance(reuseConnId: number = -1) {}
    async getUserInstance(reuseConnId: number = -1) {}

    getPathLib() {
        return super.getPathLib().posix;
    }

    dispose() {
        if (this.openedHandlers.length) {
            for (let i = 0; i < this.openedHandlers.length; i++) {
                const handleId = this.openedHandlers[i];
                closeObject(handleId);
            }
        }
        this.emit("dispose");
        this.removeAllListeners();
    }
}

register(PROTOCOLS.LOCALSHELL, LocalShellNodes);
