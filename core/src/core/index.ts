import { app, protocol, BrowserWindow } from "electron";
import { report_app_statis } from '../utils/collect';
import { check_app_update } from './AppUpdate';
import "./preloadIpc";
import { debugLog } from "../utils/debuglog";

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
        debugLog("[Core] registerSchemesAsPrivileged");
        protocol.registerSchemesAsPrivileged([
            { scheme: PROTOCOL_APP, privileges: { standard: true, secure: true } }
        ]);
        debugLog("[Core] waiting for app.whenReady()");
        await app.whenReady();
        debugLog("[Core] app ready");

        if (process.platform !== "win32") {
            process.env.NXSHELL_SOCK_DIR = app.getPath("temp");
        }
        debugLog(`[Core] NXSHELL_SOCK_DIR=${process.env.NXSHELL_SOCK_DIR}`);

        try {
            debugLog("[Core] Core.initialize()");
            await Core.initialize();
            debugLog("[Core] Core.initialize() done");
        } catch (e) {
            debugLog(`[Core] Core.initialize() error: ${(e as Error).stack || (e as Error).message || e}`);
            return;
        }

        try {
            debugLog("[Core] open_shell_instance()");
            await open_shell_instance();
            debugLog("[Core] open_shell_instance() done");
        } catch (e) {
            debugLog(`[Core] open_shell_instance() error: ${(e as Error).stack || (e as Error).message || e}`);
        }

        process_macos_acitve_event();
        report_app_statis();
        setup_app_report_interval();
        debugLog("[Core] all initialization complete");
    }
};
