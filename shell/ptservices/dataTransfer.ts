import { NxDataTransfer, NxTransferDataDesc, NxTransferAnswers, NxTransferMessage } from "../common/nxsys/dataTransfer";
import { getNodeSessionInstanceByUUID } from "./nodes";
import { createObjectHandle, getObject } from "./nxobjs";
import WaitObject from "../common/utils/waitObject";

declare const powertools: any;

class NxDataTransferServer extends NxDataTransfer {
    from: NxTransferDataDesc | null = null;
    to: NxTransferDataDesc | null = null;
    lastWaitObject: WaitObject | null = null;
    answers: NxTransferAnswers | null = null;
    channel: any = null;

    constructor() {
        super();
        this.answers = {
            overwrite: { action: "ask", keep: false },
            merge: { action: "ask", keep: false }
        };
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

    async askIfNeed(sourcePathLib: any, sourceFS: any, destFS: any, sourcePath: string, destPath: string): Promise<any> {
        const exist = await destFS.exists(destPath);
        if (!exist) {
            return null;
        }
        const sourceStat = await sourceFS.stat(sourcePath);
        const destStat = await destFS.stat(destPath);

        if ((sourceStat.isDirectory() && (!destStat.isDirectory())) ||
            ((!sourceStat.isDirectory()) && (destStat.isDirectory()))
        ) {
            this._emit({ event: "error", args: { message: "", type: "exsits" } });
            throw new Error("file or directory exsits");
        }

        let question = sourceStat.isDirectory() ? "merge" : "overwrite";
        const basename = sourcePathLib.basename(sourcePath);

        const { action, keep } = await this._ask(question, {
            name: basename,
            dest: { lastModify: destStat.mtime, size: destStat.size },
            src: { lastModify: sourceStat.mtime, size: sourceStat.size }
        });

        return action;
    }

    async copyFile(sourceFS: any, destFS: any, sourcePath: string, destPath: string, sourceSize: number = 0, emitProgress: boolean = false) {
        const BUFF_SIZE = 65536;
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
                if (!emitProgress) { return; }
                let endDate = new Date();
                let _seconds = (endDate.getTime() - startDate.getTime()) / 1000;
                let speed = (that as any)._speedHuman(totalWrite * 8 / _seconds, 2);
                that._emit({ event: "transferring", args: { progress: Math.round(totalWrite / sourceSize * 100), speed } });
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
        } catch (err) {
            throw err;
        } finally {
            if (srcFileHandle) { await sourceFS.close(srcFileHandle); }
            if (destFileHandle) { await destFS.close(destFileHandle); }
        }
    }

    async copyFolder(sourcePathLib: any, destPathLib: any, sourceFS: any, destFS: any, sourcePath: string, destPath: string) {
        const copyInfo = await this.walkFolder(sourcePathLib, sourceFS, sourcePath);
        let { files, totalFileCount, totalFileSize } = copyInfo;
        let copySize = 0;
        let remainder = totalFileCount;

        for (let i = 0; i < files.length; i++) {
            let fileInfo = files[i];
            let start_time = new Date().getTime();

            const replaceReg = sourcePathLib.sep == "\\" ? /\\/g : /\//g;
            const destRelPath = fileInfo.path.replace(replaceReg, destPathLib.sep);
            let destFilePath = destPathLib.resolve(destPath, destRelPath);
            if (fileInfo.type === "dir") {
                let action = await this.askIfNeed(sourcePathLib, sourceFS, destFS, sourcePath, destFilePath);
                if (action === "cancel") { return; }
                if (destFilePath === destPathLib.normalize(destPath)) { continue; }
                if (action !== "skip" && action !== "merge") {
                    await destFS.mkdir(destFilePath);
                }
            } else {
                let sourceDirPath = sourcePathLib.resolve(sourcePath, fileInfo.path);
                let action = await this.askIfNeed(sourcePathLib, sourceFS, destFS, sourceDirPath, destFilePath);
                if (action === "cancel") { return; }
                if (action !== "skip") {
                    await this.copyFile(sourceFS, destFS, sourceDirPath, destFilePath, fileInfo.size, false);
                    copySize += fileInfo.size;
                }
            }
            remainder--;
            let end_time = new Date().getTime();
            let speed = this._speedHuman(fileInfo.size / (end_time - start_time) * 1000, 2);
            this._emit({
                event: "transferring",
                args: { progress: Math.round(copySize / totalFileSize * 100), remainder, totalFileCount, speed }
            });
        }
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

    async _ask(question: string, args: any): Promise<any> {
        const answer = (this.answers as any)[question];
        if (answer.action === "ask" || (!answer.keep)) {
            this._emit({ event: "ask", args: { question, args } });
            this.lastWaitObject = new WaitObject();
            const userAnswer = await this.lastWaitObject.wait();
            answer.action = userAnswer.action;
            answer.keep = userAnswer.keep;
        }
        return answer;
    }

    answer(action: any, keep: boolean) {
        this.lastWaitObject!.resolve({ action, keep });
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
                        const action = await this.askIfNeed(fromNode.getPathLib(), sourceFS, destFS, fromPath, toPath);
                        if (action === "cancel" || action === "skip") { return; }
                    }
                }

                if (stat.isDirectory()) {
                    await this.copyFolder(fromNode.getPathLib(), toNode.getPathLib(), sourceFS, destFS, fromPath, toPath);
                } else {
                    let fileName: string;
                    if (toType === "file") {
                        fileName = toPath;
                    } else {
                        const basename = fromNode.getPathLib().basename(fromPath);
                        fileName = toNode.getPathLib().resolve(toPath, basename);
                    }
                    const action = await this.askIfNeed(fromNode.getPathLib(), sourceFS, destFS, fromPath, fileName);
                    if (action == "cancel" || action == "skip") { return; }
                    await this.copyFile(sourceFS, destFS, fromPath, fileName, stat.size, true);
                }
            } catch (err: any) {
                console.error(err);
                this._emit({ event: "error", args: { message: err.message } });
            } finally {
                sourceFS.dispose();
                destFS.dispose();
                this._emit({ event: "finished" });
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
