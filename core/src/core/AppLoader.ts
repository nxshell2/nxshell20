import { RPCServer, ChannelServer, dispatch } from "./AppRPC";
import { getConnectFile, bindHsIPCChannelById, createServer } from "./HSpeedIPC";
import { debugLog } from "../utils/debuglog";

const moduleName = process.argv[2];
let args = process.argv.slice(3);

debugLog(`[AppLoader] starting moduleName=${moduleName}`);

function ipcSend(body: any, { dest, src }: { dest?: string; src?: string }) {
    process.send!({ dest, src, body });
}

let server = new RPCServer();
let channelServer = new ChannelServer(ipcSend);

const powertools = {
    bindChannelByPeerId(peerId: number) {
        return channelServer.bindChannelByPeerId(peerId);
    },
    bindHsIPCChannelById(id: number) {
        return bindHsIPCChannelById(id);
    },
    getHsIPCConnectFile() {
        return getConnectFile();
    },
    createHsIPCServer() {
        return createServer();
    }
};

(global as any).powertools = powertools;

Object.freeze(powertools);
Object.defineProperty(global, "powertools", {
    writable: false
});

const AppServiceModule = eval(`require("${moduleName.replace(/\\/g, '\\\\')}")`);

debugLog(`[AppLoader] module loaded`);

const serviceEntry = AppServiceModule.default || AppServiceModule;

debugLog(`[AppLoader] serviceEntry=${typeof serviceEntry}`);

async function initService() {
    debugLog(`[AppLoader] initService start`);
    try {
        if (serviceEntry.init) {
            let ret = serviceEntry.init(...args);
            if (ret && typeof ret.then === "function") {
                await ret;
            }
        }

        server.registerService(serviceEntry);
        debugLog(`[AppLoader] service registered`);

        process.on("message", (msg: any) => {
            let { dest, src, body } = msg;
            let routerInfo = { src: dest, dest: src };
            dispatch(body,
                () => {},
                async (callReq: any) => {
                    let retResponse = await server.dispatchCall(callReq);
                    ipcSend(retResponse, routerInfo);
                },
                (channelPacket: any) => {
                    channelServer.dispatchChannelData(channelPacket, routerInfo);
                }
            );
        });
    } catch (e) {
        debugLog(`[AppLoader] initService error: ${(e as Error).stack || (e as Error).message || e}`);
    }
}

initService();

process.on("uncaughtException", (err: Error, origin: string) => {
    debugLog(`[AppLoader] uncaughtException: ${err.message} origin=${origin}`);
    debugLog(`[AppLoader] stack: ${err.stack}`);
    console.error("Error:", err.message);
    console.log("Origin:", origin);
    console.log(err.stack);
});
