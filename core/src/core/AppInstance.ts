import { BrowserWindow, ipcMain, IpcMainEvent, WebContents } from "electron";
import { EventEmitter } from "events";
import * as path from "path";
import * as os from "os";

import { PROTOCOL_APP } from "./Protocol";
import { AppServiceManager, AppService } from "./AppService";
import { getGlobalExchange } from "./AppIPC";
import { createWindow, WINDOW_TYPE } from "./AppViewProvider";

interface AppPackageInfo {
  appPath: string;
  package: any;
}

interface IpcHandlerEntry {
  channel: string;
  handler: (event: IpcMainEvent, ...args: any[]) => void;
}

function parseWindowFeatures(features: string | undefined): any {
  const options: any = {};
  if (!features) return options;
  features.split(",").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (!key || value === undefined) return;
    const k = key.trim();
    const v = value.trim();
    if (v === "" || v === "no" || v === "0") options[k] = false;
    else if (v === "yes" || v === "1") options[k] = true;
    else if (/^-?\d+$/.test(v)) options[k] = parseInt(v, 10);
    else options[k] = v;
  });
  return options;
}

class AppInstance extends EventEmitter {
  static VIEW_TYPE = { MAIN_WINDOW: 0, SUB_WINDOW: 1 };

  view: BrowserWindow | null = null;
  service: AppService | null = null;
  appPackageInfo: AppPackageInfo;
  appInstanceId: number;
  _ipcHandlers: IpcHandlerEntry[] | null = null;

  constructor(appPackageInfo: AppPackageInfo, appInstanceId: number, args: any[]) {
    super();
    this.appPackageInfo = appPackageInfo;
    this.appInstanceId = appInstanceId;

    let init = async () => {
      await this._createView();
      this._createService(...args);
      this._initHandlers();
    };

    init();
  }

  _initHandlers() {
    const renderRouter = `${this.appPackageInfo.package.name}-render-${this.appInstanceId}`;
    const currentServiceName = this.appPackageInfo.package.name;
    let webContents = this.view!.webContents;

    let ipcExchange = getGlobalExchange();

    this.service!.on("message", (data: any) => {
      ipcExchange.sendTo(renderRouter, currentServiceName, data.body);
    });
    ipcExchange.onRecv(currentServiceName, ({ dest, src, body }) => {
      if (this.service!.isTerminate) {
        return;
      }

      this.service!.sendMessage({ dest, src, body });
    });
    const makeIpcHandler = (serviceName: string) => (event: IpcMainEvent, ...args: any[]) => {
      if (!this.view || this.view.webContents.isDestroyed() || event.sender.id !== this.view.webContents.id) {
        return;
      }
      ipcExchange.sendTo(serviceName, renderRouter, args[0]);
    };
    this._ipcHandlers = [
      { channel: "ptIPC", handler: makeIpcHandler(currentServiceName) },
      { channel: `ptIPC:${currentServiceName}`, handler: makeIpcHandler(currentServiceName) },
      { channel: "ptIPC:powertools-core", handler: makeIpcHandler("powertools-core") }
    ];
    this._ipcHandlers.forEach(({ channel, handler }) => {
      ipcMain.on(channel, handler);
    });

    this.view!.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
      const options = parseWindowFeatures(features);
      options.show = false;
      if (frameName === "modal") {
        Object.assign(options, {
          modal: true,
          parent: this.view,
          center: true,
          resizable: false,
          minimizable: false,
          maximizable: false,
          closable: true,
          frame: true
        });
        delete options.x;
        delete options.y;
      }
      return { action: "allow", overrideBrowserWindowOptions: options };
    });
    this.view!.webContents.on("did-create-window", (newGuest: BrowserWindow) => {
      newGuest.removeMenu();
      newGuest.show();
    });
    ipcExchange.onRecv(renderRouter, ({ dest, src, body }) => {
      if (webContents.isDestroyed()) {
        return;
      }

      let channel = "ptIPC";
      if (src !== currentServiceName) {
        channel += ":" + src;
      }

      webContents.send(channel, body);
    });
  }

  _getViewURL(): string {
    const isURL = /^https?:\/\/.*/;
    let index = this.appPackageInfo.package.resources.index || "index.html";
    if (isURL.test(this.appPackageInfo.package.resources.index)) {
      return index;
    } else {
      return `${PROTOCOL_APP}://${this.appPackageInfo.package.name}/${this.appPackageInfo.package.resources.path}${index}`;
    }
  }

  async _createView() {
    let startInfo = this.appPackageInfo.package.start || {};
    this.view = await createWindow(startInfo.view || WINDOW_TYPE.MAIN_WINDOW, startInfo.viewFlags || []);
    if (process.env.NODE_ENV === "development") {
      this.view.webContents.openDevTools();
    }

    this._setIconOnLinux();
    this._forwardWindowEvents();
    this.view.loadURL(this._getViewURL());
  }

  _forwardWindowEvents() {
    const webContents = this.view!.webContents;
    const events = ["blur", "focus", "maximize", "unmaximize"];
    events.forEach((ev) => {
      this.view!.on(ev, () => {
        if (!webContents.isDestroyed()) {
          webContents.send("pt:window-event", ev);
        }
      });
    });
  }

  _setIconOnLinux() {
    if (os.type() !== 'Linux') {
      return;
    }
    let icon_path = path.join(process.resourcesPath, 'nxshell.png');
    if (process.env.NODE_ENV === "development") {
      icon_path = path.join(process.cwd(), 'nxshell.png');
    }
    this.view!.setIcon(icon_path);
  }

  _getServiceModulePath(): string {
    const packageInfo = this.appPackageInfo;
    if (path.isAbsolute(packageInfo.package.main)) {
      return packageInfo.package.main;
    } else {
      return path.join(packageInfo.appPath, packageInfo.package.main);
    }
  }

  _createService(...args: any[]) {
    const packageInfo = this.appPackageInfo;
    if (!packageInfo.package.main) {
      return;
    }
    this.service = AppServiceManager.createService(packageInfo.package.name,
      this._getServiceModulePath(),
      ...args
    );
  }

  setViewBounds(bounds: any) {}

  saveViewBounds() {}

  close() {
    if (this._ipcHandlers) {
      this._ipcHandlers.forEach(({ channel, handler }) => {
        ipcMain.removeListener(channel, handler);
      });
      this._ipcHandlers = null;
    }
    if (this.view && !this.view.isDestroyed()) {
      this.view.close();
    }
    if (this.service) {
      const packageInfo = this.appPackageInfo;
      if (!packageInfo.package.main) {
        return;
      }
      AppServiceManager.terminateService(packageInfo.package.name,
        this.appInstanceId,
        true
      );
      this.service = null;

      let ipcExchange = getGlobalExchange();
      const currentServiceName = this.appPackageInfo.package.name;
      ipcExchange.disconnect(currentServiceName);
    }
  }
}

export default AppInstance;
