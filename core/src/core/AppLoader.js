/**
 * App加载器
 * 
 * 为新的App实例构造运行环境
 */
const {RPCServer, ChannelServer, dispatch} = require("./AppRPC");
const {getConnectFile, bindHsIPCChannelById, createServer} = require("./HSpeedIPC");

/**
 * argv布局:
 *     0: electron
 *     1: AppLoader.js
 *     2: moduleName
 *     4...: args
 */
const moduleName = process.argv[2];
let args = process.argv.slice(3);

function ipcSend(body, {dest, src}) {
    process.send({dest, src, body});
}

let server = new RPCServer();
let channelServer = new ChannelServer(ipcSend);

const powertools = {
    bindChannelByPeerId(peerId) {
        return channelServer.bindChannelByPeerId(peerId);
    },
    bindHsIPCChannelById(id) {
        return bindHsIPCChannelById(id);
    },
    getHsIPCConnectFile() {
        return getConnectFile();
    },
    createHsIPCServer() {
        return createServer();
    }
};

global.powertools = powertools;

Object.freeze(powertools);
Object.defineProperty(global, "powertools", {
    writable: false
});

const AppServiceModule = eval(`require("${moduleName.replace(/\\/g, '\\\\')}")`);

/** 如果包含default则为ESModule */
const serviceEntry = AppServiceModule.default || AppServiceModule;

async function initService() {
    if (serviceEntry.init) {
        let ret = serviceEntry.init(...args);
        if (ret && typeof ret.then === "function") {
            await ret;
        }
    }

    server.registerService(serviceEntry);

    process.on("message", (msg) => {
        let {dest, src, body} = msg;
        let routerInfo = {src: dest, dest: src};
        dispatch(body,
            () => {},
            async (callReq) => {
                let retResponse = await server.dispatchCall(callReq);
                ipcSend(retResponse, routerInfo);
            },
            (channelPacket) => {
                channelServer.dispatchChannelData(channelPacket, routerInfo);
            }
        );
    });
}



initService();

process.on("uncaughtException", (err, origin) => {
    console.error("Error:", err.message);
    console.log("Origin:", origin);
    console.log(err.stack);
});
