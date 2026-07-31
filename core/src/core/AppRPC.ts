import { EventEmitter } from "events";

const RPC_PACKET_TYPE = {
    APPREADY: 0,
    RPCCALL: 1,
    CHANNEL: 2,
};

interface RPCPacket {
    type: number;
    body: any;
}

function makeRPCPacket(type: number, body: any): RPCPacket {
    return { type, body };
}

function makeRPCRequestPacket(callId: number, method: string, ...args: any[]): RPCPacket {
    return makeRPCPacket(RPC_PACKET_TYPE.RPCCALL, {
        callId,
        method,
        args
    });
}

function makeRPCResponsePacket(callId: number, retVal: any, err: any): RPCPacket {
    return makeRPCPacket(RPC_PACKET_TYPE.RPCCALL, {
        callId,
        retVal,
        err
    });
}

function makeChannelPacket(channelId: number, data: any): RPCPacket {
    return makeRPCPacket(RPC_PACKET_TYPE.CHANNEL, {
        channelId,
        data
    });
}

class CallWaiter {
    resolve: (obj: any) => void = () => {};
    reject: (err: any) => void = () => {};
    promise: Promise<any> | null = null;
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = (obj: any) => {
                resolve(obj);
            };
            this.reject = (err: any) => {
                reject(err);
            };
        });
    }

    wait() {
        return this.promise!;
    }
}

type SendFunc = (data: any) => void;

class RPCClient {
    lastCallId: number = 0;
    callWaiter: { [key: number]: CallWaiter } = {};

    send: SendFunc = () => {};

    constructor(send: SendFunc) {
        this.send = send;
    }

    getLastCallId(): number {
        let callId = this.lastCallId++;
        if (this.lastCallId === Number.MAX_SAFE_INTEGER) {
            this.lastCallId = 0;
        }

        return callId;
    }

    async doCall(method: string, ...args: any[]): Promise<any> {
        let callId = this.getLastCallId();
        let req = makeRPCRequestPacket(callId, method, ...args);
        let callWaiter = new CallWaiter();
        this.callWaiter[callId] = callWaiter;
        let ret;
        try {
            this.send(req);
            ret = await callWaiter.wait();
        } catch (e) {
            throw e;
        } finally {
            delete this.callWaiter[callId];
        }

        return ret;
    }

    dispatchResult(ret: any) {
        let waiter = this.callWaiter[ret.callId];
        if (!waiter) {
            return;
        }
        if (ret.err) {
            waiter.reject(ret.err);
            return;
        }
        waiter.resolve(ret.retVal);
    }
}

class RPCServer {
    serviceHandlers: any = {};
    constructor() {}

    registerService(serviceHandlers: any) {
        this.serviceHandlers = serviceHandlers;
    }

    async dispatchCall(callReq: any): Promise<RPCPacket> {
        let { callId, method, args } = callReq;
        let retVal, err;
        let func = this.serviceHandlers[method];
        if (!func) {
            err = new Error(`No method '${method}'!`);
        } else {
            try {
                retVal = func.call(this.serviceHandlers, ...args);
                if (retVal && typeof retVal.then === "function") {
                    retVal = await retVal;
                }
            } catch (e) {
                retVal = undefined;
                err = e;
            }
        }

        return makeRPCResponsePacket(callId, retVal, err);
    }
}

class Channel extends EventEmitter {
    mgr: ChannelMgr;
    channelId: number = 0;

    constructor(mgr: ChannelMgr, channelId: number) {
        super();
        this.mgr = mgr;
        this.channelId = channelId;
    }

    send(data: any) {
        let sendData = makeChannelPacket(this.channelId, data);
        this.mgr.send(this, sendData);
    }

    onDataArrived(data: any) {
        this.emit("data", data);
    }
}

interface RouterInfo {
    src?: string;
    dest?: string;
}

class ChannelMgr extends EventEmitter {
    lastChannelId: number = 0;
    identity: number = 0;
    channels: { [key: number]: Channel } = {};
    peers: { [key: number]: RouterInfo | null } = {};
    sendFunc: ((data: any, routerInfo?: RouterInfo) => void) | null = null;

    constructor(sendFunc: ((data: any, routerInfo?: RouterInfo) => void) | null, identity: number = 0) {
        super();
        this.sendFunc = sendFunc;
        this.identity = identity;
    }

    getChannel(channelId: number): Channel | null {
        return this.channels[channelId] || null;
    }

    createChannel(): Channel {
        let id = this.lastChannelId++;
        if (this.lastChannelId === 65536) {
            this.lastChannelId = 0;
        }

        id = this.identity << 16 | id;

        let ch = new Channel(this, id);
        this.channels[id] = ch;
        ch.send(null);
        return ch;
    }

    _bindChannelByPeerId(peerId: number): Channel {
        let ch = this.getChannel(peerId);
        if (!ch) {
            ch = new Channel(this, peerId);
            this.channels[peerId] = ch;
        }

        return ch;
    }

    bindChannelByPeerId(peerId: number): Channel {
        return this._bindChannelByPeerId(peerId);
    }

    _createPeer(peerId: number, routerInfo: RouterInfo | null) {
        let ch = this._bindChannelByPeerId(peerId);
        this.peers[peerId] = routerInfo;
        ch.send(null);
    }

    dispatchChannelData(packet: any, routerInfo: RouterInfo | null = null) {
        let { channelId, data } = packet;
        if (data === null) {
            this._createPeer(channelId, routerInfo);
            return;
        }

        let ch = this.getChannel(channelId);
        if (!ch) {
            return;
        }

        ch.onDataArrived(data);
    }

    send(ch: Channel, data: any) {
        let routerInfo = this.peers[ch.channelId];
        if (this.sendFunc) {
            this.sendFunc(data, routerInfo);
        }
    }
}

class ChannelClient extends ChannelMgr {
    constructor(send: SendFunc, pid: number) {
        super(send, pid);
    }

    _createPeer(peerId: number, routerInfo: RouterInfo | null) {
        let ch = this.getChannel(peerId);
        if (ch === null) {
            throw new Error("invalid peerId");
        }

        ch.emit("ready");
    }

    bindChannelByPeerId(channelId: number): Channel {
        throw new Error("can not use method `bindChannelByPeerId' at client side");
    }
}

class ChannelServer extends ChannelMgr {
    constructor(send: (data: any, routerInfo?: RouterInfo) => void) {
        super(send);
    }

    createChannel(): Channel {
        throw new Error("can not use method `createChannel' at server side");
    }
}

function dispatch(data: any, appReadyCb: () => void, rpcRecvCb: (callReq: any) => void, channelRecvCb: (channelPacket: any) => void) {
    if (data.type === RPC_PACKET_TYPE.APPREADY) {
        appReadyCb();
    } else if (data.type === RPC_PACKET_TYPE.RPCCALL) {
        rpcRecvCb(data.body);
    } else if (data.type === RPC_PACKET_TYPE.CHANNEL) {
        channelRecvCb(data.body);
    }
}

export {
    RPCClient,
    RPCServer,
    ChannelClient,
    ChannelServer,
    Channel,
    dispatch
};
