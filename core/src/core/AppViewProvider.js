const {webContents, BrowserWindow} = require("electron");
const {EventEmitter} = require("events");

const AppRPC = require("./AppRPC");

const WINDOW_TYPE = {
    MAIN_WINDOW: "mainWindow",
    SUB_WINDOW: "subWindow"
};

/**
 * @type {AppRPC.Channel}
 */
let windowProviderChannel = null;

let lastWindowProviderRequestId = 0;
let requestWaiters = {};

/** FIXME: 这段代码与AppRPC中有一段代码一样，以后可以考虑合并 */
class RequestWaiter {
    resolve = () => {};
    reject = () => {};
    promise = null;
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = (value) => {
                resolve(value);
            }
            this.reject = (e) => {
                reject(e);
            }
        });
    }

    wait() {
        return this.promise;
    }
}

function getLastWindowProviderRequestId() {
    let id = lastWindowProviderRequestId++;
    if (lastWindowProviderRequestId === Number.MAX_SAFE_INTEGER) {
        lastWindowProviderRequestId = 0;
    }
    return id;
}

/**
 * 处理Window提供者的响应
 *
 * @param {Object} viewInfo 视图信息
 * @param {Number} viewInfo.reqId 请求ID
 * @param {Number} viewInfo.webContentId webContentId
 */
function onWindowProviderResponse(viewInfo) {
    let waiter = requestWaiters[viewInfo.reqId];
    if (!waiter) {
        console.error(new Error("invalid view info"));
        return;
    }
    waiter.resolve(viewInfo);

    delete requestWaiters[viewInfo.reqId];
}


class ShellAppView extends EventEmitter{
    /** @type {webContents} */
    webContents = null;
    constructor(wc) {
        super();
        this.webContents = wc;
    }

    loadURL(url) {
        return this.webContents.loadURL(url);
    }
}

const subViewManager = {
    lastViewId: 0,
    views: {},
    getLastViewId() {
        // 不同于RPC类似的Request，理论上lastViewId用到最大的时候会变为0然后继续，但是这个为0的view很有可能依然存在
        // 不过Number.MAX_SAFE_INTEGER，应该在有生之年是用不完的了
        let id = this.lastViewId++;
        if (this.lastViewId >= Number.MAX_SAFE_INTEGER) {
            this.lastViewId = 0;
        }
        return id;
    },

    async callViewProvider(webContentId=null, method="", args=[]) {
        let reqId = getLastWindowProviderRequestId();
        windowProviderChannel.send({
            reqId,
            webContentId,
            method,
            args
        });
        let waiter = new RequestWaiter();
        requestWaiters[reqId] = waiter;
        let response = await waiter.wait();
        return response
    },

    async createView() {
        let {webContentId} = this.callViewProvider();
        const _this = this;
        let viewProxy = new Proxy({}, {
            get(target, p, receiver) {
                return async function(...args) {
                    return await _this.callViewProvider(webContentId, p, args)
                }
            },
            set(target, p, value, receiver) {
                // TODO:
            }
        })

        return viewProxy
    }
}

function get_nxshell_logo() {

}


const windowProviders = {
    async mainWindow (flags) {
        /** @type {import("electron/main").BrowserWindowConstructorOptions} */
        let options = {
            width: 1250,
            minWidth: 1250,
            height: 720,
            minHeight: 720,
            show: false,
            webPreferences: {
                preload: `${__dirname}/AppClient.js`,
                webviewTag: true,
                contextIsolation: false,
                sandbox: false
            },
            icon: get_nxshell_logo()
        };
        let transparent = false;
        for (let winFlag of (flags || [])) {
            if (winFlag === "frameless") {
                options.frame = false;
            } else if (winFlag === "hidden") {
                options.titleBarStyle = "hidden";
            } else if (winFlag === "transparent") {
                options.transparent = true;
                transparent = true;
            }
        }

        let window = new BrowserWindow(options);
        if (transparent) {
            // window.setIgnoreMouseEvents(true);
        }

        window.once("ready-to-show", () => {
            window.show();
        })

        return window;
    },

    async subWindow (flags) {
        // 总是创建新窗口
        return await windowProviders.mainWindow(flags);
    }
}


async function createWindow(windowType, flags) {
    let windowCtor = windowProviders[windowType] || windowProviders.mainWindow;

    return await windowCtor(flags);
}

/**
 * 注册一个窗口提供者
 *
 * @param {Channel} winProviderChannel window管理提供者提供的channel
 */
function registerWindowProvider(winProviderChannel) {
    if (windowProviderChannel) {
        return;
    }
    windowProviderChannel = winProviderChannel;

    winProviderChannel.on("data", (data) => {
        onWindowProviderResponse(data);
    });
}

module.exports = {
    WINDOW_TYPE,

    registerWindowProvider,

    createWindow
};
