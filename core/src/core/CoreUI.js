const { BrowserWindow, dialog } = require("electron");

module.exports = {
    async showOpenDialog(options) {
        const win = BrowserWindow.getFocusedWindow();
        const ret = await dialog.showOpenDialog(win, options);
        return ret;
    },

    async showSaveDialog(options) {
        const win = BrowserWindow.getFocusedWindow();
        const ret = await dialog.showSaveDialog(win, options);
        return ret;
    },

    showMessageBox(options) {
        //const currentWindow = BrowserWindow.getFocusedWindow();
        return dialog.showMessageBox( options);

    }
}