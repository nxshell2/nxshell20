import * as fs from "fs";
import * as path from "path";

const isChildProcess = typeof process.send === "function";
let logDir: string | null = null;

function getLogFile(): string | null {
    if (logDir) {
        return path.join(logDir, "nxshell-debug.log");
    }
    if (isChildProcess) {
        return null;
    }
    try {
        const electron = require("electron");
        logDir = electron.app.getPath("userData");
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    } catch (e) {
        logDir = path.join(process.env.HOME || ".", "Library", "Logs", "NxShell");
        try {
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        } catch (_e) {
            logDir = process.env.HOME || process.cwd();
        }
    }
    return path.join(logDir, "nxshell-debug.log");
}

export function debugLog(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    if (isChildProcess) {
        return;
    }
    try {
        const logFile = getLogFile();
        if (logFile) {
            fs.appendFileSync(logFile, line + "\n", { encoding: "utf8" });
        }
    } catch (_e) {
        // ignore
    }
}

export function debugError(msg: string, err?: any) {
    const errStr = err ? (err.stack || err.message || String(err)) : "";
    const full = `${msg} ${errStr}`;
    debugLog(`[ERROR] ${full}`);
    if (isChildProcess) {
        return;
    }
    try {
        const electron = require("electron");
        electron.dialog.showErrorBox("NxShell Debug", full);
    } catch (_e) {
        // ignore
    }
}
