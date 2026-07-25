const {EventEmitter} = require("events")


const RPC_PACKET_TYPE = {
    APPREADY: 0,
    RPCCALL: 1,
    CHANNEL: 2,
};

function makeRPCPacket(type, body) {
    return {
        type,
        body
    };
}

function makeRPCRequestPacket(callId, method, ...args) {
    return makeRPCPacket(RPC_PACKET_TYPE.RPCCALL, {
        callId,
        method,
        args
    });
}

function makeRPCResponsePacket(callId, retVal, err) {
    return makeRPCPacket(RPC_PACKET_TYPE.RPCCALL, {
        callId,
        retVal,
        err
    });
}

function makeChannelPacket(channelId, data) {
    return makeRPCPacket(RPC_PACKET_TYPE.CHANNEL, {
        channelId,
        data
    });
}


class CallWaiter {
    resolve = () => {};
    reject = () => {};
    /** @type {Promise} */
    promise = null;
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = (obj) => {
                resolve(obj);
            };

            this.reject = (err) => {
                reject(err);
            };
        })
    }

    wait() {
        return this.promise;
    }
}

class RPCClient {
    lastCallId = 0;
    callWaiter = {};

    send = () => {};

    constructor(send) {
        this.send = send;
    }

    getLastCallId() {
        let callId = this.lastCallId++;
        if (this.lastCallId === Number.MAX_SAFE_INTEGER) {
            this.lastCallId = 0;
        }

        return callId;
    }

    async doCall(method, ...args) {
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

    dispatchResult(ret) {
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
    serviceHandlers = {};
    constructor() {}

    registerService(serviceHandlers) {
        this.serviceHandlers = serviceHandlers;
    }

    async dispatchCall(callReq) {
        let {callId, method, args} = callReq;
        let retVal, err;
        let func = this.serviceHandlers[method];
        if (!func) {
            err = new Error(`No method '${method}'!`);
        } else {
            try {
                retVal = func.call(this.serviceHandlers, ...args);
                // 判断是否为Promise
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
    /** @type {ChannelMgr} */
    mgr = null;
    channelId = 0;

    constructor(mgr, channelId) {
        super();
        this.mgr = mgr;
        this.channelId = channelId;
    }

    send(data) {
        let sendData = makeChannelPacket(this.channelId, data);
        this.mgr.send(this, sendData);
    }

    onDataArrived(data) {
        this.emit("data", data);
    }
}

class ChannelMgr extends EventEmitter {
    lastChannelId = 0;
    identity = 0;
    channels = {};
    peers = {};
    sendFunc = null;

    constructor(sendFunc, identity = 0) {
        super();
        this.sendFunc = sendFunc;
        this.identity = identity;
    }

    /**
     * 获取一个Channel
     * 
     * @param {Number} channelId channelId
     * @return {Channel}
     */
    getChannel(channelId) {
        return this.channels[channelId] || null;
    }

    /**
     * 创建一个新的Channel
     * 
     * @return {Channel}
     */
    createChannel() {
        let id = this.lastChannelId++;
        if (this.lastChannelId === 65536) {
            this.lastChannelId = 0;
        }

        id = this.identity << 16 | id;

        let ch = new Channel(this, id);
        this.channels[id] = ch;
        // 发送一个空包，让服务端进行确认
        ch.send(null);
        return ch;
    }

    _bindChannelByPeerId(peerId) {
        let ch = this.getChannel(peerId);
        if (!ch) {
            ch = new Channel(this, peerId);
            this.channels[peerId] = ch;
        }

        return ch;
    }

    bindChannelByPeerId(peerId) {
        return this._bindChannelByPeerId(peerId);
    }

    _createPeer(peerId, routerInfo) {
        let ch = this._bindChannelByPeerId(peerId);
        this.peers[peerId] = routerInfo;
        ch.send(null);
    }

    dispatchChannelData(packet, routerInfo=null) {
        let {channelId, data} = packet;
        /** data === null的情况下是首次连接，客户端让服务端进行一个确认 */
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

    send(ch, data) {
        let routerInfo = this.peers[ch.channelId];
        if (this.sendFunc) {
            this.sendFunc(data, routerInfo);
        }
    }
}

class ChannelClient extends ChannelMgr {
    constructor(send, pid) {
        super(send, pid);
    }

    /** @override */
    _createPeer(peerId, routerInfo) {
        let ch = this.getChannel(peerId);
        if (ch === null) {
            throw new Error("invalid peerId");
        }
        
        ch.emit("ready");
    }

    /** @override */
    bindChannelByPeerId(channelId) {
        throw new Error("can not use method `bindChannelByPeerId' at client side");
    }
}

class ChannelServer extends ChannelMgr{
    constructor(send) {
        super(send);
    }

    /** @override */
    createChannel() {
        throw new Error("can not use method `createChannel' at server side");
    }
}


function dispatch(data, appReadyCb, rpcRecvCb, channelRecvCb) {
    if (data.type === RPC_PACKET_TYPE.APPREADY) {
        appReadyCb(data.body);
    } else if (data.type === RPC_PACKET_TYPE.RPCCALL) {
        rpcRecvCb(data.body);
    } else if (data.type === RPC_PACKET_TYPE.CHANNEL) {
        channelRecvCb(data.body)
    }
}


module.exports = {
    RPCClient,
    RPCServer,
    ChannelClient,
    ChannelServer,

    dispatch
};
