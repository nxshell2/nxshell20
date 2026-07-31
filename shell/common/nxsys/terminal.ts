import { EventEmitter } from "events";

const NXTERMINAL_EVENTS = {
    DATA: "data",
    CLOSE: "close",
    ERROR: "error"
};

class NxTerminal extends EventEmitter {
    async init(termOps?: any) {}
    async bindDataChannel(channelId: number) {}
    async getConnection() {}
    async sendData(data: any) {}
    async setWindowSize(cols: number, rows: number) {}
    async getWindowSize() {}
    async close() {}
    async dispose() {}
}

export {
    NXTERMINAL_EVENTS,
    NxTerminal
};
