import { protocol } from "electron";
import * as path from "path";

import { PROTOCOL_APP } from "./Protocol";
import { walkDir } from "../utils/dir";
import { read } from "../utils/jsonreader";

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
  protocol.registerFileProtocol(PROTOCOL_APP, (request: any, callback: any) => {
    let url = request.url.substr(skip);
    callback(path.join(APP_INSTALL_DIR, url));
  });
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
