import { ipcMain, app, BrowserWindow, IpcMainEvent } from "electron";
import * as fs from "fs";
import * as path from "path";

function getWindowFromEvent(event: IpcMainEvent): BrowserWindow | null {
    return BrowserWindow.fromWebContents(event.sender);
}

const fileWatchers: Map<string, fs.FSWatcher> = new Map();

ipcMain.on("pt:watch-file", (event: IpcMainEvent, watchId: string, filePath: string) => {
    if (fileWatchers.has(watchId)) {
        return;
    }
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath);
    let lastMtime = 0;
    try {
        const stat = fs.statSync(filePath);
        lastMtime = stat.mtimeMs;
    } catch {}

    try {
        const watcher = fs.watch(dir, (eventType: string, filename: string) => {
            if (filename && path.basename(filename) === basename) {
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.mtimeMs !== lastMtime) {
                        lastMtime = stat.mtimeMs;
                        event.sender.send("pt:file-changed", watchId);
                    }
                } catch {}
            }
        });
        fileWatchers.set(watchId, watcher);
    } catch {}
});

ipcMain.on("pt:stop-watch-file", (event: IpcMainEvent, watchId: string) => {
    const watcher = fileWatchers.get(watchId);
    if (watcher) {
        watcher.close();
        fileWatchers.delete(watchId);
    }
});

ipcMain.on("pt:get-path-sync", (event: IpcMainEvent, name: string) => {
    event.returnValue = app.getPath(name as any);
});

ipcMain.on("pt:get-app-path-sync", (event: IpcMainEvent) => {
    event.returnValue = app.getAppPath();
});

ipcMain.on("pt:get-temp-path-sync", (event: IpcMainEvent) => {
    event.returnValue = app.getPath("temp");
});

ipcMain.on("pt:window-minimize", (event: IpcMainEvent) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) win.minimize();
});

ipcMain.on("pt:window-maximize", (event: IpcMainEvent) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) win.maximize();
});

ipcMain.on("pt:window-unmaximize", (event: IpcMainEvent) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) win.unmaximize();
});

ipcMain.on("pt:window-close", (event: IpcMainEvent) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) win.close();
});

ipcMain.on("pt:window-is-maximized", (event: IpcMainEvent) => {
    const win = getWindowFromEvent(event);
    event.returnValue = !!(win && !win.isDestroyed() && win.isMaximized());
});
