const { ipcMain, app, BrowserWindow } = require("electron");

function getWindowFromEvent(event) {
    return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.on("pt:get-path-sync", (event, name) => {
    event.returnValue = app.getPath(name);
});

ipcMain.on("pt:get-app-path-sync", (event) => {
    event.returnValue = app.getAppPath();
});

ipcMain.on("pt:window-minimize", (event) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) win.minimize();
});

ipcMain.on("pt:window-maximize", (event) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) win.maximize();
});

ipcMain.on("pt:window-unmaximize", (event) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) win.unmaximize();
});

ipcMain.on("pt:window-close", (event) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) win.close();
});

ipcMain.on("pt:window-is-maximized", (event) => {
    const win = getWindowFromEvent(event);
    event.returnValue = !!(win && !win.isDestroyed() && win.isMaximized());
});
