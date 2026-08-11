import { crashReporter } from "electron";
import * as versionInfo from "./version/version.json";
import { debugLog, debugError } from "./utils/debuglog";

debugLog("=== NxShell starting ===");
debugLog(`process.resourcesPath=${process.resourcesPath}`);

process.on("uncaughtException", (e) => {
    debugError("[uncaughtException]", e);
    process.exit(1);
});

process.on("unhandledRejection", (e) => {
    debugError("[unhandledRejection]", e);
});

crashReporter.start({
    submitUrl: "",
    uploadToServer: false,
    compress: false,
    ignoreSystemCrashHandler: true,
    extra: {
        version: versionInfo.version
    }
});
debugLog("[crashReporter] started");

import Core from "./core";

Core.initialize().then(() => {
    debugLog("Core.initialize() completed successfully");
}).catch((e) => {
    debugError("[Core.initialize] Unhandled error:", e);
});
