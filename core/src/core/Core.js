const path = require("path");

const AppPackageManager = require("./AppPackageManager");
const AppInstance = require("./AppInstance");
const AppIPC = require("./AppIPC");
const {ChannelServer, RPCServer, dispatch} = require("./AppRPC");
const {registerWindowProvider} = require("./AppViewProvider");
const CoreUI = require("./CoreUI");

let initialized = false;
let appInstances = {};
let lastAppInstanceId = 0;

/** @type {RPCServer} */
let rpcServer = null;

/** @type {ChannelServer} */
let channelServer = null;


/**
 * 启动Shell
 * 在我们的架构中，Shell也属于一个应用存在的
 * 但是相对于其他的应用，Shell是独立的窗口，并负责托管管理其他应用的窗口
 * 
 * @param  {...any} args 启动参数列表
 */
async function startShell(...args) {
    let shellAppStartInfo = await AppPackageManager.getShellAppStartInfo();
    return await startApp(shellAppStartInfo.package.name, ...args);
}


async function startApp(appName, ...args) {
    let appStartInfo = await AppPackageManager.getAppStartInfo(appName);

    let appInstance = new AppInstance(appStartInfo, lastAppInstanceId, args);

    appInstances[lastAppInstanceId] = appInstance;
    lastAppInstanceId++;

    return appInstance;
}

/**
 * 核心服务处理器
 * @typedef CoreServiceHandler
 */
const CoreServiceHandler = {
    /**
     * 启动一个应用
     * @memberof CoreServiceHandler
     * 
     * @param {String} app 应用名称
     * @param  {...any} args 应用启动参数
     */
    async startApp(app, ...args) {
        let ret;
        try {
            ret = await startApp(app, ...args);
        } catch (e) {
            throw e;
        }

        return ret;
    },

    /**
     * 注册窗口管理的ChannelId，由powertools-shell提供
     * 在Powertools生命周期内只能注册一次
     * 
     * @param {Number} windowProviderChannelId Window提供者的ChannelId，由Powertools-shell提供
     */
    async registerWindowProvider(windowProviderChannelId) {
        let channel = channelServer.bindChannelByPeerId(windowProviderChannelId);

        registerWindowProvider(channel);
    },

    preloadScriptIsLoaded: false,
    /**
     * 获取应用预加载脚本
     * @description 在Shell的webview中，preload脚本属性必须使用file:或者asar:协议的路径
     */
    getAppPreloadScript() {
        if (CoreServiceHandler.preloadScriptIsLoaded) {
            throw new Error("preload script can only be get once.")
        }
        let preloadPath = path.join(__dirname, "./AppClient.js");
        if (process.platform === "win32") {
            preloadPath = `/${preloadPath.replace(/\\/g, "/")}`;
        }

        return `file://${preloadPath}`;
    },

    ...CoreUI
}

/**
 * 初始化核心
 */
async function initialize() {
    /* 避免再次初始化 */
    if (initialized) {
        return;
    }
    let IPCExchange = AppIPC.getGlobalExchange();

    let ipcSend = (data, {dest, src}) => {
        IPCExchange.sendTo(dest, src, data);
    }

    rpcServer = new RPCServer();
    rpcServer.registerService(CoreServiceHandler);
    
    channelServer = new ChannelServer(ipcSend);

    IPCExchange.onRecv("powertools-core", ({dest, src, body}) => {
        let routerInfo = {src: dest, dest: src};
        dispatch(body, 
            () => {},
            async (callReq) => {
                let retResponse = await rpcServer.dispatchCall(callReq);
                ipcSend(retResponse, routerInfo);
            }, 
            (channelPacket) => {
                channelServer.dispatchChannelData(channelPacket, routerInfo);
            }
        );
    });

    // 扫描已安装的应用
    await AppPackageManager.scanInstalledApp();
    // 安装应用协议
    AppPackageManager.setupAppProtocol();

    initialized = true;
}


module.exports = {
    initialize,

    startShell,
    startApp
}