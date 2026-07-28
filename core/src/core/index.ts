import { app, protocol, BrowserWindow } from "electron";
import { report_app_statis } from '../utils/collect';
import { check_app_update } from './AppUpdate';
import "./preloadIpc";

import * as Core from "./Core";
import { PROTOCOL_APP } from "./Protocol";

let core_appinstance: any = null;

app.on("window-all-closed", () => {
    close_shell_instance();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function process_macos_acitve_event() {
    if (process.platform !== 'darwin') {
        return;
    }
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            open_shell_instance();
        }
    });
}

async function open_shell_instance() {
    if (!core_appinstance) {
        core_appinstance = await Core.startShell(...process.argv.slice(1));
    }
}

function close_shell_instance() {
    if (core_appinstance) {
        core_appinstance.close();
        core_appinstance = null;
    }
}

function setup_app_report_interval() {
    const interval = 24 * 60 * 60 * 1000;
    setInterval(() => {
        report_app_statis();
    }, interval);
}

export default {
    async initialize() {
        protocol.registerSchemesAsPrivileged([
            { scheme: PROTOCOL_APP, privileges: { standard: true, secure: true } }
        ]);
        await app.whenReady();

        await Core.initialize();

        await open_shell_instance();

        process_macos_acitve_event();

        report_app_statis();
        setup_app_report_interval();
    }
};
