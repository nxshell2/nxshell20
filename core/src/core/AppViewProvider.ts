import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { EventEmitter } from "events";

import * as AppRPC from "./AppRPC";
import { Channel } from "./AppRPC";

const WINDOW_TYPE = {
  MAIN_WINDOW: "mainWindow",
  SUB_WINDOW: "subWindow"
};

let windowProviderChannel: Channel | null = null;

let lastWindowProviderRequestId = 0;
let requestWaiters: { [key: number]: RequestWaiter } = {};

class RequestWaiter {
  resolve: (value: any) => void = () => {};
  reject: (e: any) => void = () => {};
  promise: Promise<any> | null = null;
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (value: any) => {
        resolve(value);
      };
      this.reject = (e: any) => {
        reject(e);
      };
    });
  }

  wait() {
    return this.promise!;
  }
}

function getLastWindowProviderRequestId(): number {
  let id = lastWindowProviderRequestId++;
  if (lastWindowProviderRequestId === Number.MAX_SAFE_INTEGER) {
    lastWindowProviderRequestId = 0;
  }
  return id;
}

function onWindowProviderResponse(viewInfo: any) {
  let waiter = requestWaiters[viewInfo.reqId];
  if (!waiter) {
    console.error(new Error("invalid view info"));
    return;
  }
  waiter.resolve(viewInfo);

  delete requestWaiters[viewInfo.reqId];
}

class ShellAppView extends EventEmitter {
  webContents: any = null;
  constructor(wc: any) {
    super();
    this.webContents = wc;
  }

  loadURL(url: string) {
    return this.webContents.loadURL(url);
  }
}

const subViewManager = {
  lastViewId: 0,
  views: {} as { [key: number]: any },

  getLastViewId(): number {
    let id = this.lastViewId++;
    if (this.lastViewId >= Number.MAX_SAFE_INTEGER) {
      this.lastViewId = 0;
    }
    return id;
  },

  async callViewProvider(webContentId: number | null = null, method: string = "", args: any[] = []) {
    let reqId = getLastWindowProviderRequestId();
    windowProviderChannel!.send({
      reqId,
      webContentId,
      method,
      args
    });
    let waiter = new RequestWaiter();
    requestWaiters[reqId] = waiter;
    let response = await waiter.wait();
    return response;
  },

  async createView() {
    let { webContentId } = await this.callViewProvider();
    const _this = this;
    let viewProxy = new Proxy({}, {
      get(target: any, p: string, receiver: any) {
        return async function (...args: any[]) {
          return await _this.callViewProvider(webContentId, p, args);
        };
      },
      set(target: any, p: string, value: any, receiver: any) {
      }
    });

    return viewProxy;
  }
};

function get_nxshell_logo() {
}

const windowProviders = {
  async mainWindow(flags?: string[]): Promise<BrowserWindow> {
    let options: BrowserWindowConstructorOptions = {
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
      } as any,
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
    }

    window.once("ready-to-show", () => {
      window.show();
    });

    return window;
  },

  async subWindow(flags?: string[]): Promise<BrowserWindow> {
    return await windowProviders.mainWindow(flags);
  }
};

export async function createWindow(windowType: string, flags?: string[]): Promise<BrowserWindow> {
  let windowCtor = (windowProviders as any)[windowType] || windowProviders.mainWindow;
  return await windowCtor(flags);
}

export function registerWindowProvider(winProviderChannel: Channel) {
  if (windowProviderChannel) {
    return;
  }
  windowProviderChannel = winProviderChannel;

  winProviderChannel.on("data", (data: any) => {
    onWindowProviderResponse(data);
  });
}

export { WINDOW_TYPE };
