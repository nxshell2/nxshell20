import * as path from "path";

import * as AppPackageManager from "./AppPackageManager";
import AppInstance from "./AppInstance";
import * as AppIPC from "./AppIPC";
import { ChannelServer, RPCServer, dispatch } from "./AppRPC";
import { registerWindowProvider } from "./AppViewProvider";
import { AppServiceManager } from "./AppService";
import * as CoreUI from "./CoreUI";

let initialized = false;
let appInstances: { [key: number]: AppInstance } = {};
let lastAppInstanceId = 0;

let rpcServer: RPCServer | null = null;
let channelServer: ChannelServer | null = null;

async function startShell(...args: any[]): Promise<AppInstance> {
    let shellAppStartInfo = await AppPackageManager.getShellAppStartInfo();
    return await startApp(shellAppStartInfo.package.name, ...args);
}

async function startApp(appName: string, ...args: any[]): Promise<AppInstance> {
    let appStartInfo = await AppPackageManager.getAppStartInfo(appName);

    let appInstance = new AppInstance(appStartInfo, lastAppInstanceId, args);

    appInstances[lastAppInstanceId] = appInstance;
    lastAppInstanceId++;

    return appInstance;
}

const CoreServiceHandler = {
    async startApp(app: string, ...args: any[]) {
        let ret;
        try {
            ret = await startApp(app, ...args);
        } catch (e) {
            throw e;
        }

        return ret;
    },

    async registerWindowProvider(windowProviderChannelId: number) {
        let channel = channelServer!.bindChannelByPeerId(windowProviderChannelId);
        registerWindowProvider(channel);
    },

    preloadScriptIsLoaded: false,

    getAppPreloadScript() {
        if (CoreServiceHandler.preloadScriptIsLoaded) {
            throw new Error("preload script can only be get once.");
        }
        let preloadPath = path.join(__dirname, "./AppClient.js");
        if (process.platform === "win32") {
            preloadPath = `/${preloadPath.replace(/\\/g, "/")}`;
        }

        return `file://${preloadPath}`;
    },

    ...CoreUI
};

function terminateAllServices() {
    AppServiceManager.terminateAllServices(true);
}

async function initialize() {
    if (initialized) {
        return;
    }
    let IPCExchange = AppIPC.getGlobalExchange();

    let ipcSend = (data: any, { dest, src }: { dest?: string; src?: string }) => {
        IPCExchange.sendTo(dest!, src!, data);
    };

    rpcServer = new RPCServer();
    rpcServer.registerService(CoreServiceHandler);

    channelServer = new ChannelServer(ipcSend);

    IPCExchange.onRecv("powertools-core", ({ dest, src, body }) => {
        let routerInfo = { src: dest, dest: src };
        dispatch(body,
            () => {},
            async (callReq: any) => {
                let retResponse = await rpcServer!.dispatchCall(callReq);
                ipcSend(retResponse, routerInfo);
            },
            (channelPacket: any) => {
                channelServer!.dispatchChannelData(channelPacket, routerInfo);
            }
        );
    });

    await AppPackageManager.scanInstalledApp();
    AppPackageManager.setupAppProtocol();

    initialized = true;
}

export {
    initialize,
    startShell,
    startApp,
    terminateAllServices
};
