import { ipcMain, app, BrowserWindow, IpcMainEvent } from "electron";

function getWindowFromEvent(event: IpcMainEvent): BrowserWindow | null {
    return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.on("pt:get-path-sync", (event: IpcMainEvent, name: string) => {
    event.returnValue = app.getPath(name as any);
});

ipcMain.on("pt:get-app-path-sync", (event: IpcMainEvent) => {
    event.returnValue = app.getAppPath();
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
