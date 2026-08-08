import { RPCServer, ChannelServer, dispatch } from "./AppRPC";
import { getConnectFile, bindHsIPCChannelById, createServer } from "./HSpeedIPC";

const moduleName = process.argv[2];
let args = process.argv.slice(3);

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

const serviceEntry = AppServiceModule.default || AppServiceModule;

async function initService() {
  if (serviceEntry.init) {
    let ret = serviceEntry.init(...args);
    if (ret && typeof ret.then === "function") {
      await ret;
    }
  }

  server.registerService(serviceEntry);

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
}

initService();

process.on("uncaughtException", (err: Error, origin: string) => {
  console.error("Error:", err.message);
  console.log("Origin:", origin);
  console.log(err.stack);
});
