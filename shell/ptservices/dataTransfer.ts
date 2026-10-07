import { NxDataTransfer, NxTransferDataDesc, NxTransferMessage } from "../common/nxsys/dataTransfer";
import { getNodeSessionInstanceByUUID } from "./nodes";
import { createObjectHandle, getObject } from "./nxobjs";
declare const powertools: any;

class NxDataTransferServer extends NxDataTransfer {
    from: NxTransferDataDesc | null = null;
    to: NxTransferDataDesc | null = null;
    channel: any = null;
    _fileIdSeq: number = 0;

    _nextFileId(): number {
        return ++this._fileIdSeq;
    }

    _setFrom(from: NxTransferDataDesc) {
        this.from = from;
    }

    _setTo(to: NxTransferDataDesc) {
        this.to = to;
    }

    _bindChannel(channelId: number) {
        this.channel = powertools.bindChannelByPeerId(channelId);
    }

    _emit(msg: NxTransferMessage) {
        this.channel.send(msg);
    }

    async walkFolder(pathLib: any, fs: any, rootDir: string) {
        const rootPath = pathLib.normalize(rootDir);
        const files: any[] = [];
        let totalFileCount = 0;
        let totalFileSize = 0;

        const walk = async (relPath: string) => {
            const currentPath = pathLib.resolve(rootPath, relPath);
            const direntList = await fs.readdir(currentPath);
            for (let i = 0; i < direntList.length; i++) {
                const dirent = direntList[i];
                const dirpath = pathLib.join(relPath, dirent.name);
                const folderList: string[] = [];
                let isFolder = false;
                let stats = await fs.lstat(pathLib.resolve(rootPath, dirpath));
                if (dirent.isDirectory()) {
                    folderList.push(dirpath);
                    isFolder = true;
                }
                const fileSize = dirent.isDirectory() ? 0 : stats.size;
                totalFileSize += fileSize;
                totalFileCount++;
                files.push({
                    name: dirent.name,
                    path: dirpath,
                    size: fileSize,
                    type: dirent.isDirectory() ? "dir" : "file"
                });
                for (let j = 0; j < folderList.length; j++) {
                    await walk(folderList[j]);
                }
            }
        };

        await walk(".");
        return { files, totalFileSize, totalFileCount };
    }

    async copyFile(sourceFS: any, destFS: any, sourcePath: string, destPath: string, sourceSize: number = 0, onProgress: ((progress: number, speed: string) => void) | null = null) {
        if (sourceFS.sftp && !destFS.sftp) {
            return await this._fastGetFile(sourceFS, destPath, sourcePath, sourceSize, onProgress);
        }
        if (destFS.sftp && !sourceFS.sftp) {
            return await this._fastPutFile(sourceFS, destFS, destPath, sourcePath, sourceSize, onProgress);
        }

        const BUFF_SIZE = 262144;
        const rwBuffer = Buffer.allocUnsafe(BUFF_SIZE);
        let totalWrite = 0;
        let srcFileHandle: any;
        let destFileHandle: any;

        try {
            srcFileHandle = await sourceFS.open(sourcePath, "r");
            destFileHandle = await destFS.open(destPath, "w");
            let rwOffset = 0;
            let that = this;
            let startDate = new Date();

            function send_speed() {
                if (!onProgress) { return; }
                let endDate = new Date();
                let _seconds = (endDate.getTime() - startDate.getTime()) / 1000;
                let speed = (that as any)._speedHuman(totalWrite * 8 / _seconds, 2);
                onProgress(Math.round(totalWrite / (sourceSize || 1) * 100), speed);
            }

            let loop = 0;
            while (true) {
                let { bytesRead } = await sourceFS.read(srcFileHandle, rwBuffer, 0, BUFF_SIZE, rwOffset);
                if (bytesRead) {
                    await destFS.write(destFileHandle, rwBuffer, 0, bytesRead, rwOffset);
                    rwOffset += bytesRead;
                }
                totalWrite += bytesRead;
                if (loop > 10) { send_speed(); loop = 0; }
                loop += 1;
                if (bytesRead < BUFF_SIZE) { break; }
            }
            if (onProgress) { onProgress(100, ''); }
        } catch (err) {
            throw err;
        } finally {
            if (srcFileHandle) { await sourceFS.close(srcFileHandle); }
            if (destFileHandle) { await destFS.close(destFileHandle); }
        }
    }

    async _fastGetFile(sourceFS: any, destPath: string, sourcePath: string, sourceSize: number, onProgress: ((progress: number, speed: string) => void) | null) {
        const that = this;
        const startDate = new Date();
        let lastEmitProgress = -1;

        return new Promise<void>((resolve, reject) => {
            const options: any = {
                step: (totalTransferred: number, chunk: number, total: number) => {
                    if (!onProgress) return;
                    const progress = Math.round(totalTransferred / (sourceSize || total) * 100);
                    if (progress === lastEmitProgress) return;
                    lastEmitProgress = progress;
                    const endDate: any = new Date();
                    const _seconds = (endDate - startDate) / 1000;
                    const speed = (that as any)._speedHuman(totalTransferred * 8 / _seconds, 2);
                    onProgress(progress, speed);
                }
            };
            sourceFS.sftp.fastGet(sourcePath, destPath, options, (err: any) => {
                if (onProgress && !err) {
                    onProgress(100, '');
                }
                if (err) { reject(err); } else { resolve(); }
            });
        });
    }

    async _fastPutFile(sourceFS: any, destFS: any, destPath: string, sourcePath: string, sourceSize: number, onProgress: ((progress: number, speed: string) => void) | null) {
        const that = this;
        const startDate = new Date();
        let lastEmitProgress = -1;

        return new Promise<void>((resolve, reject) => {
            const options: any = {
                step: (totalTransferred: number, chunk: number, total: number) => {
                    if (!onProgress) return;
                    const progress = Math.round(totalTransferred / (sourceSize || total) * 100);
                    if (progress === lastEmitProgress) return;
                    lastEmitProgress = progress;
                    const endDate: any = new Date();
                    const _seconds = (endDate - startDate) / 1000;
                    const speed = (that as any)._speedHuman(totalTransferred * 8 / _seconds, 2);
                    onProgress(progress, speed);
                }
            };
            destFS.sftp.fastPut(sourcePath, destPath, options, (err: any) => {
                if (onProgress && !err) {
                    onProgress(100, '');
                }
                if (err) { reject(err); } else { resolve(); }
            });
        });
    }

    /**
     * Build the flat list of files to transfer (and create destination directories).
     * Directories are created best-effort; files that fail will be reported per-file.
     */
    async _buildFolderEntries(sourcePathLib: any, destPathLib: any, sourceFS: any, destFS: any, sourcePath: string, destPath: string) {
        const copyInfo = await this.walkFolder(sourcePathLib, sourceFS, sourcePath);
        const { files } = copyInfo;
        const replaceReg = sourcePathLib.sep == "\\" ? /\\/g : /\//g;
        const entries: any[] = [];

        for (let i = 0; i < files.length; i++) {
            const fileInfo = files[i];
            const destRelPath = fileInfo.path.replace(replaceReg, destPathLib.sep);
            const destFilePath = destPathLib.resolve(destPath, destRelPath);
            if (fileInfo.type === "dir") {
                if (destFilePath === destPathLib.normalize(destPath)) { continue; }
                try {
                    await destFS.mkdir(destFilePath);
                } catch (e: any) {
                    console.warn("[dataTransfer] mkdir failed:", destFilePath, e && e.message);
                }
            } else {
                entries.push({
                    fileId: this._nextFileId(),
                    name: fileInfo.name,
                    relPath: fileInfo.path,
                    sourcePath: sourcePathLib.resolve(sourcePath, fileInfo.path),
                    destPath: destFilePath,
                    size: fileInfo.size
                });
            }
        }
        return entries;
    }

    _speedHuman(speed: number, precision?: number): string {
        if (!/^([-+])?|(\.\d+)(\d+(\.\d+)?|(\d+\.)|Infinity)$/.test(speed as any)) {
            return '-';
        }
        if (speed === 0) return '0';
        if (typeof precision === 'undefined') precision = 1;
        const units = ['b/s', 'Kb/s', 'Mb/s', 'Gb/s', 'Tb/s', 'Pb/s'];
        const num = Math.floor(Math.log(speed) / Math.log(1000));
        const value = (speed / Math.pow(1000, Math.floor(num))).toFixed(precision);
        return `${value} ${units[num]}`;
    }

    startTransferring() {
        if (this.from === null) {
            throw new Error("Invalid data transfer: no source");
        }
        if (this.to === null) {
            throw new Error("Invalid data transfer: no dest");
        }

        let { nodeUUID: fromNodeUUID, path: fromPath, connId: fromConnId = -1, createFolder: sourceCreateFolder = false } = this.from;
        let { nodeUUID: toNodeUUID, path: toPath, type: toType, connId: toConnId = -1, createFolder: destCreateFolder = false } = this.to;

        // upload: source is local (empty nodeUUID); download: dest is local
        const direction = fromNodeUUID === "" ? "upload" : "download";

        const doTransfer = async () => {
            const fromNode = getNodeSessionInstanceByUUID(fromNodeUUID);
            const toNode = getNodeSessionInstanceByUUID(toNodeUUID);
            this._emit({ event: "prepare" });

            const sourceFSHandle = await fromNode.getFSInstance(fromConnId);
            const sourceFS = getObject(sourceFSHandle);
            const destFSHandle = await toNode.getFSInstance(toConnId);
            const destFS = getObject(destFSHandle);

            try {
                await sourceFS.init();
                await destFS.init();
                const stat = await sourceFS.stat(fromPath);

                if (sourceCreateFolder) {
                    let basename = fromNode.getPathLib().basename(fromPath);
                    toPath = toNode.getPathLib().resolve(toPath, basename);
                    const exists = await destFS.exists(toPath);
                    if (!exists) {
                        await destFS.mkdir(toPath);
                    } else {
                        const destStat = await destFS.stat(toPath);
                        if (!destStat.isDirectory()) {
                            this._emit({ event: "error", args: { message: "", type: "exsits" } });
                            return;
                        }
                    }
                }

                // Build the flat list of files to transfer.
                let entries: any[];
                if (stat.isDirectory()) {
                    entries = await this._buildFolderEntries(fromNode.getPathLib(), toNode.getPathLib(), sourceFS, destFS, fromPath, toPath);
                } else {
                    let fileName: string;
                    if (toType === "file") {
                        fileName = toPath;
                    } else {
                        const basename = fromNode.getPathLib().basename(fromPath);
                        fileName = toNode.getPathLib().resolve(toPath, basename);
                    }
                    entries = [{
                        fileId: this._nextFileId(),
                        name: fromNode.getPathLib().basename(fromPath),
                        sourcePath: fromPath,
                        destPath: fileName,
                        size: stat.size
                    }];
                }

                const total = entries.length;
                this._emit({
                    event: "queued",
                    args: {
                        direction,
                        files: entries.map((e) => ({ fileId: e.fileId, name: e.name, size: e.size, sourcePath: e.sourcePath, destPath: e.destPath }))
                    }
                });

                let totalFileSize = entries.reduce((acc, e) => acc + (e.size || 0), 0);
                let copySize = 0;
                const failed: any[] = [];

                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    this._emit({
                        event: "file-start",
                        args: { fileId: entry.fileId, name: entry.name, size: entry.size, index: i, total, direction }
                    });
                    try {
                        await this.copyFile(sourceFS, destFS, entry.sourcePath, entry.destPath, entry.size, (progress, speed) => {
                            this._emit({ event: "file-progress", args: { fileId: entry.fileId, progress, speed } });
                        });
                        this._emit({ event: "file-done", args: { fileId: entry.fileId } });
                    } catch (err: any) {
                        const message = (err && err.message) ? err.message : String(err);
                        console.error("[dataTransfer] file failed:", entry.sourcePath, message);
                        failed.push({ fileId: entry.fileId, name: entry.name, message });
                        this._emit({ event: "file-error", args: { fileId: entry.fileId, message } });
                    }
                    copySize += entry.size || 0;
                    // aggregate progress for the legacy status bar
                    this._emit({
                        event: "transferring",
                        args: {
                            progress: totalFileSize > 0 ? Math.round(copySize / totalFileSize * 100) : Math.round((i + 1) / total * 100),
                            remainder: total - (i + 1),
                            totalFileCount: total,
                            speed: ""
                        }
                    });
                }

                this._emit({ event: "filecreated" });
                this._emit({ event: "all-done", args: { total, success: total - failed.length, failed } });

                if (failed.length > 0) {
                    const summary = failed.length === total
                        ? (failed[0].message || "transfer failed")
                        : `${failed.length}/${total} file(s) failed`;
                    this._emit({ event: "error", args: { message: summary, failed, partial: failed.length < total } });
                } else {
                    this._emit({ event: "finished" });
                }
            } catch (err: any) {
                console.error(err);
                this._emit({ event: "error", args: { message: (err && err.message) ? err.message : String(err) } });
            } finally {
                sourceFS.dispose();
                destFS.dispose();
            }
        };

        doTransfer();
    }

    dispose() {}
}

function createDataTransfer(): number {
    const transfer = new NxDataTransferServer();
    const handler = createObjectHandle(transfer);
    return handler;
}

export { createDataTransfer };
