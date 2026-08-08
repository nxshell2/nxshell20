import { ipcMain, app, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFile } from "child_process";

function getWindowFromEvent(event: IpcMainEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

const fileWatchers: Map<string, fs.FSWatcher> = new Map();

ipcMain.on("pt:watch-file", (event: IpcMainEvent, watchId: string, filePath: string) => {
  if (fileWatchers.has(watchId)) {
    return;
  }
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  let lastMtime = 0;
  try {
    const stat = fs.statSync(filePath);
    lastMtime = stat.mtimeMs;
  } catch {}

  try {
    const watcher = fs.watch(dir, (eventType: string, filename: string) => {
      if (filename && path.basename(filename) === basename) {
        try {
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs !== lastMtime) {
            lastMtime = stat.mtimeMs;
            event.sender.send("pt:file-changed", watchId);
          }
        } catch {}
      }
    });
    fileWatchers.set(watchId, watcher);
  } catch {}
});

ipcMain.on("pt:stop-watch-file", (event: IpcMainEvent, watchId: string) => {
  const watcher = fileWatchers.get(watchId);
  if (watcher) {
    watcher.close();
    fileWatchers.delete(watchId);
  }
});

ipcMain.on("pt:get-path-sync", (event: IpcMainEvent, name: string) => {
  event.returnValue = app.getPath(name as any);
});

ipcMain.on("pt:get-app-path-sync", (event: IpcMainEvent) => {
  event.returnValue = app.getAppPath();
});

ipcMain.on("pt:get-temp-path-sync", (event: IpcMainEvent) => {
  event.returnValue = app.getPath("temp");
});

ipcMain.on("pt:window-minimize", (event: IpcMainEvent) => {
  const win = getWindowFromEvent(event);
  if (win && !win.isDestroyed()) win.minimize();
});

ipcMain.on("pt:window-maximize", (event: IpcMainEvent) => {
  const win = getWindowFromEvent(event);
  if (win && !win.isDestroyed()) win.maximize();
});

ipcMain.on("pt:window-unmaximize", (event: IpcMainEvent) => {
  const win = getWindowFromEvent(event);
  if (win && !win.isDestroyed()) win.unmaximize();
});

ipcMain.on("pt:window-close", (event: IpcMainEvent) => {
  const win = getWindowFromEvent(event);
  if (win && !win.isDestroyed()) win.close();
});

ipcMain.on("pt:window-is-maximized", (event: IpcMainEvent) => {
  const win = getWindowFromEvent(event);
  event.returnValue = !!(win && !win.isDestroyed() && win.isMaximized());
});

function getSshDir(): string {
  return path.join(os.homedir(), ".ssh");
}

ipcMain.handle("pt:ssh-generate-key", async (event: IpcMainInvokeEvent, opts: { type: string; name: string; passphrase?: string; bits?: number }) => {
  const sshDir = getSshDir();
  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
  }

  const keyName = opts.name || `id_${opts.type}`;
  const keyPath = path.join(sshDir, keyName);

  if (fs.existsSync(keyPath)) {
    throw new Error(`Key ${keyName} already exists`);
  }

  const keyType = opts.type === "ed25519" ? "ed25519" : "rsa";
  const bits = opts.bits || 4096;
  const comment = `${os.userInfo().username}@${os.hostname()}`;

  const args = [
    "-t", keyType,
    "-f", keyPath,
    "-C", comment,
    "-N", opts.passphrase || "",
  ];
  if (keyType === "rsa") {
    args.push("-b", String(bits));
  }

  return new Promise((resolve, reject) => {
    execFile("ssh-keygen", args, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      const pubKeyPath = `${keyPath}.pub`;
      const publicKey = fs.existsSync(pubKeyPath) ? fs.readFileSync(pubKeyPath, "utf-8").trim() : "";
      resolve({ keyPath, pubKeyPath, publicKey });
    });
  });
});

ipcMain.handle("pt:ssh-list-keys", async () => {
  const sshDir = getSshDir();
  if (!fs.existsSync(sshDir)) {
    return [];
  }

  const entries = fs.readdirSync(sshDir);
  const keys: any[] = [];

  for (const entry of entries) {
    if (entry.endsWith(".pub")) {
      const baseName = entry.slice(0, -4);
      const pubPath = path.join(sshDir, entry);
      const privPath = path.join(sshDir, baseName);

      if (!fs.existsSync(privPath)) continue;

      let keyType = "unknown";
      let comment = "";
      try {
        const content = fs.readFileSync(pubPath, "utf-8").trim();
        const parts = content.split(" ");
        if (parts.length >= 2) {
          keyType = parts[0];
          comment = parts.slice(2).join(" ");
        }
      } catch {}

      let privStat: fs.Stats | null = null;
      try { privStat = fs.statSync(privPath); } catch {}

      keys.push({
        name: baseName,
        type: keyType,
        comment,
        pubPath,
        privPath,
        createdAt: privStat ? privStat.mtime.toISOString() : "",
      });
    }
  }

  return keys;
});

ipcMain.handle("pt:ssh-delete-key", async (event: IpcMainInvokeEvent, keyName: string) => {
  const sshDir = getSshDir();
  const privPath = path.join(sshDir, keyName);
  const pubPath = path.join(sshDir, `${keyName}.pub`);

  if (fs.existsSync(privPath)) fs.unlinkSync(privPath);
  if (fs.existsSync(pubPath)) fs.unlinkSync(pubPath);

  return true;
});

ipcMain.handle("pt:ssh-read-public-key", async (event: IpcMainInvokeEvent, keyName: string) => {
  const sshDir = getSshDir();
  const pubPath = path.join(sshDir, `${keyName}.pub`);
  if (!fs.existsSync(pubPath)) {
    throw new Error(`Public key ${keyName}.pub not found`);
  }
  return fs.readFileSync(pubPath, "utf-8").trim();
});

ipcMain.handle("pt:ssh-read-private-key", async (event: IpcMainInvokeEvent, keyName: string) => {
  const sshDir = getSshDir();
  const privPath = path.join(sshDir, keyName);
  if (!fs.existsSync(privPath)) {
    throw new Error(`Private key ${keyName} not found`);
  }
  return fs.readFileSync(privPath, "utf-8");
});
