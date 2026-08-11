import { protocol } from "electron";
import * as fs from "fs";
import * as path from "path";

import { PROTOCOL_APP } from "./Protocol";
import { walkDir } from "../utils/dir";
import { read } from "../utils/jsonreader";
import { debugLog } from "../utils/debuglog";

const MIME_TYPES: { [key: string]: string } = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".otf": "font/otf",
    ".map": "application/json",
    ".txt": "text/plain",
    ".xml": "application/xml",
    ".wasm": "application/wasm",
};

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || "application/octet-stream";
}

interface InstalledApp {
    appPath: string;
    package: any;
}

let installedApps: { [key: string]: InstalledApp } = {};

let resourcesPath = process.resourcesPath;
if (process.env["NODE_ENV"] === "development") {
    resourcesPath = path.join(process.cwd(), "resources");
}

const APP_INSTALL_DIR = path.join(resourcesPath, "apps");

export async function scanInstalledApp() {
    if (process.env.NODE_ENV === "development" && process.env.POWERTOOLS_DEV_PACKAGE) {
        let devPackage = JSON.parse(process.env.POWERTOOLS_DEV_PACKAGE);
        installedApps[devPackage.name] = {
            appPath: process.cwd(),
            package: devPackage
        };
        return;
    }
    walkDir(APP_INSTALL_DIR, [".json"]).map((packagePath) => {
        let appPath = path.dirname(packagePath);
        let appPackagePath = path.basename(packagePath);
        if (appPackagePath !== "package.json") {
            return null;
        }

        return {
            appPath,
            package: read(packagePath)
        };
    }).filter(v => v).forEach((packageInfo: any) => {
        installedApps[packageInfo.package.name] = packageInfo;
    });
}

export function setupAppProtocol() {
    let schemaString = PROTOCOL_APP + "://";
    let skip = schemaString.length;
    protocol.handle(PROTOCOL_APP, async (request: any) => {
        let url = request.url.substr(skip);
        let filePath = path.join(APP_INSTALL_DIR, url);
        debugLog(`[protocol.handle] url=${url} filePath=${filePath}`);
        try {
            let buffer = await fs.promises.readFile(filePath);
            debugLog(`[protocol.handle] OK: ${filePath} (${buffer.length} bytes)`);
            return new Response(buffer, {
                headers: { "Content-Type": getMimeType(filePath) }
            });
        } catch (e) {
            debugLog(`[protocol.handle] FAIL: ${filePath} - ${(e as Error).message}`);
            return new Response("Not Found", { status: 404 });
        }
    });
    debugLog("[setupAppProtocol] protocol.handle registered");
}

export async function installApp(appPackage: any) {
    // TODO: add code here
}

export async function uninstallApp(appPackage: any) {
    // TODO: add code here
}

export async function upgradeApp(appPackage: any) {
    // TODO: add code here
}

export async function getInstalledApp() {
    return installedApps;
}

export async function getAppStartInfo(appName: string): Promise<InstalledApp> {
    let appInfo = installedApps[appName];
    if (!appInfo) {
        throw new Error(`Can not find app: ${appName}`);
    }

    return appInfo;
}

export async function getShellAppStartInfo(): Promise<InstalledApp> {
    return await getAppStartInfo("powertools-shell");
}
