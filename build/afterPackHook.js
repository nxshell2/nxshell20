const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

function copyDirContents(src, dest) {
    if (!fs.existsSync(src)) {
        return;
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyDirContents(srcPath, destPath);
        } else {
            fs.mkdirSync(dest, { recursive: true });
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

module.exports = async (context) => {
    const appOutDir = context.appOutDir;
    const destDir = process.platform === "darwin"
        ? path.join(appOutDir, "NxShell.app", "Contents", "Resources", "apps", "powertools-shell")
        : path.join(appOutDir, "resources", "apps", "powertools-shell");

    fs.mkdirSync(destDir, { recursive: true });

    // Vue renderer output
    copyDirContents(path.join(rootDir, "shell", "dist"), destDir);

    // ptservices service bundle
    copyDirContents(path.join(rootDir, "shell", "devtools", "webpack", "dist"), destDir);

    // package.json identifying powertools-shell
    fs.copyFileSync(
        path.join(rootDir, "shell", "ptservices", "package.json"),
        path.join(destDir, "package.json")
    );

    // Disable V8 WASM trap handler for macOS App Sandbox compatibility
    if (process.platform === "darwin") {
        const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");
        const electronFrameworkPath = path.join(
            appOutDir, "NxShell.app", "Contents", "Frameworks",
            "Electron Framework.framework", "Versions", "A", "Electron Framework"
        );
        await flipFuses(electronFrameworkPath, {
            version: FuseVersion.V1,
            [FuseV1Options.EnableWasmTrapHandler]: false,
        });
    }
};
