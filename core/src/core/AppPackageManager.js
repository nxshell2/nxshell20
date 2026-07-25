const {protocol} = require("electron");
const path = require("path");

const {PROTOCOL_APP} = require("./Protocol");
const {walkDir} = require("../utils/dir");
const {read} = require("../utils/jsonreader");
// const {} = require("./PowerToolApp");

let installedApps = {};

let resourcesPath = process.resourcesPath;
if (process.env["NODE_ENV"] === "development") {
    resourcesPath = path.join(process.cwd(), "resources");
}

const APP_INSTALL_DIR = path.join(resourcesPath, "apps");


module.exports = {
    async scanInstalledApp() {
        if (process.env.NODE_ENV === "development" && process.env.POWERTOOLS_DEV_PACKAGE) {
            let devPackage = JSON.parse(process.env.POWERTOOLS_DEV_PACKAGE)
            installedApps[devPackage.name] = {
                appPath: process.cwd(),
                package: devPackage
            }
            return
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
            }
        }).filter(v => v).forEach(packageInfo => {
            installedApps[packageInfo.package.name] = packageInfo;
        });
    },

    setupAppProtocol() {
        let schemaString = PROTOCOL_APP + "://";
        let skip = schemaString.length;
        protocol.registerFileProtocol(PROTOCOL_APP, (request, callback) => {
            let url = request.url.substr(skip);
            callback(path.join(APP_INSTALL_DIR, url));
        });
    },

    async installApp(appPackage) {
        // TODO: add code here
    },

    async uninstallApp(appPackage) {
        // TODO: add code here
    },

    async upgradeApp(appPackage) {
        // TODO: add code here
    },

    async getInstalledApp() {
        return installedApps;
    },

    async getAppStartInfo(appName) {
        let appInfo = installedApps[appName];
        if (!appInfo) {
            throw new Error(`Can not find app: ${appName}`);
        }

        return appInfo;
    },

    async getShellAppStartInfo() {
        return await this.getAppStartInfo("powertools-shell");
    }
};
