import { PROTOCOLS, PROTOCOL_CAPS_MAP } from "../../common/nxsys/consts";
import { register } from "./registry";
import { createObjectHandle, closeObject } from "../nxobjs";
import { NxNodeServer } from "./node";
import { LOCALFileSystem } from "../fs/localfs";

class LOCALNodes extends NxNodeServer {
    caps: number = PROTOCOL_CAPS_MAP.LOCAL;
    initialized: any = null;
    sshSession: any = null;
    openedHandlers: number[] = [];
    fsHandlers: number[] = [];

    constructor(uuid: string, connProtocol: string, sessionConfig: any) {
        super(uuid, connProtocol, sessionConfig);
    }

    async _createConnection() {
    }

    _closeConnection(conn: any) {
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
        }
        return connId;
    }

    async getTerminalInstance(reuseConnId: number = -1) {
    }

    async getFSInstance(reuseConnId: number = -1): Promise<number> {
        const fs = new LOCALFileSystem(this);
        const handler = createObjectHandle(fs);
        this.openedHandlers.push(handler);
        fs.once("dispose", () => {
            this._removeOpenedHandler(handler);
        });
        return handler;
    }

    async getNetInstance(reuseConnId: number = -1) {}
    async getGUIInstance(reuseConnId: number = -1) {}
    async getUserInstance(reuseConnId: number = -1) {}

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

register(PROTOCOLS.LOCAL, LOCALNodes);
