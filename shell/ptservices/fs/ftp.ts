import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from "events";
import { PtFileSystem } from "../../common/filesystem/filesystem";
import { IdGenerator } from "../../common/utils/idGenerator";

class Dirent {
    type: string;
    name: string;
    target: string;
    sticky: any;
    rights: any;
    acl: any;
    owner: string;
    group: string;
    size: number;
    date: string;

    constructor(stats: any) {
        this.type = stats.type;
        this.name = stats.name;
        this.target = stats.target || 'unknow';
        this.sticky = stats.sticky;
        this.rights = stats.rights || { user: '-', group: '-', other: '-' };
        this.acl = stats.acl;
        this.owner = stats.owner || '0';
        this.group = stats.group || '0';
        this.size = stats.size;
        this.date = stats.date || '1990-01-01';
    }

    isDirectory() {
        return this.type === 'd';
    }
}

class ftpFileObject extends EventEmitter {
    total: number;
    size: number = 0;
    buffer: Buffer = Buffer.alloc(0);

    constructor(total: number) {
        super();
        this.total = total;
    }

    appendBuffer(buffer: Buffer) {
        this.buffer = Buffer.concat([this.buffer, buffer]);
        this.size += buffer.length;
        this.emit("datain");
    }

    copyBuffer(destBuffer: Buffer, destStart: number, length: number, position: number): number {
        let copySize = ((position + length) > this.size) ? (this.size - position) : length;
        this.buffer.copy(destBuffer, destStart, position, position + copySize);
        return copySize;
    }

    isfull() {
        return this.size === this.total;
    }
}

class FTPFileSystem extends PtFileSystem {
    openedFiles: any = null;
    sftp: any = null;
    cwd: string = './';
    parent: any = null;
    connId: number = -1;
    handleGenerator: IdGenerator = new IdGenerator(1);
    openedFileBuffers: any = null;
    ftp_client: any = null;

    constructor(parent: any, connId: number) {
        super();
        this.parent = parent;
        this.openedFiles = Object.create(null);
        this.openedFileBuffers = Object.create(null);
        this.connId = connId;
    }

    async init() {
        this.ftp_client = this.parent.refConnection(this.connId);
        return true;
    }

    async getconn() {
        return this.connId;
    }

    async readdir(location: string): Promise<Dirent[]> {
        return new Promise((resolve, reject) => {
            this.ftp_client.list(location || this.cwd, (error: any, list: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(list.map(entry => new Dirent(entry)));
                }
            });
        });
    }

    _path_dir_basename(paths: string) {
        let dir = path.dirname(paths);
        let basename = path.basename(paths);
        return { dir, basename };
    }

    async stat(path: string): Promise<Dirent | null> {
        let status: any[] = [];
        try {
            status = await this.readdir(path);
        } catch (e) {
        }
        const { dir, basename } = this._path_dir_basename(path);
        let stats = status.find((el: any) => { return el.name == basename; });
        if (stats) {
            return new Dirent(stats);
        }
        try {
            status = await this.readdir(dir);
        } catch (e) {
        }
        stats = status.find((el: any) => { return el.name == basename; });
        if (stats) {
            return new Dirent(stats);
        }
        return null;
    }

    async lstat(path: string): Promise<Dirent | null> {
        return this.stat(path);
    }

    async rename(src: string, dest: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.ftp_client.rename(src, dest, (error: any) => {
                if (error) { reject(error); } else { resolve(true); }
            });
        });
    }

    async mkdir(path: string, attrs?: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.ftp_client.mkdir(path, (error: any) => {
                if (error) { reject(error); } else { resolve(true); }
            });
        });
    }

    async rmdir(path: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.ftp_client.rmdir(path, (error: any) => {
                if (error) { reject(error); } else { resolve(true); }
            });
        });
    }

    async open(filename: string, flags: string): Promise<number> {
        let that = this;
        if (flags === 'r') {
            let stats = await this.stat(filename);
            let sizeByte = stats!.size;
            return new Promise((resolve, reject) => {
                this.ftp_client.get(filename, (error: any, handle: any) => {
                    if (error) {
                        reject(error);
                    } else {
                        let retHanlde = that.handleGenerator.getNext();
                        let fileObject = new ftpFileObject(sizeByte);
                        that.openedFiles[retHanlde] = handle;
                        that.openedFileBuffers[retHanlde] = fileObject;
                        let readStreams = that.openedFiles[retHanlde];
                        readStreams.on('data', (data: Buffer) => {
                            fileObject.appendBuffer(data);
                        });
                        handle.resume();
                        resolve(retHanlde);
                    }
                });
            });
        } else {
            let retHanlde = that.handleGenerator.getNext();
            that.openedFiles[retHanlde] = filename;
            return retHanlde;
        }
    }

    async read(handle: number, buffer: Buffer, offset: number, length: number, position: number): Promise<{ bytesRead: number }> {
        return new Promise((resolve, reject) => {
            if (!this.openedFiles[handle]) {
                reject(new Error('handle no exits'));
                return;
            }
            let readStreams = this.openedFiles[handle];
            let fileObject: ftpFileObject = this.openedFileBuffers[handle];
            if (fileObject.isfull() || ((length + position) <= fileObject.size)) {
                resolve({ bytesRead: fileObject.copyBuffer(buffer, offset, length, position) });
            } else {
                function listenOnce() {
                    fileObject.once('datain', () => {
                        if ((length + position) <= fileObject.size) {
                            resolve({ bytesRead: fileObject.copyBuffer(buffer, offset, length, position) });
                        } else {
                            listenOnce();
                        }
                    });
                }
                listenOnce();
                readStreams.on('error', (e: any) => {
                    console.log('ftp stream read error ', e);
                    reject(e);
                });
            }
        });
    }

    async write(handle: number, buffer: Buffer, offset: number, length: number, position: number): Promise<number> {
        return await new Promise((resolve, reject) => {
            if (!this.openedFiles[handle]) {
                reject(new Error("Invalid file handle"));
                return;
            }
            let filename = this.openedFiles[handle];
            if (!position) {
                this.ftp_client.put(buffer.slice(offset, offset + length), filename, (error: any) => {
                    if (error) { reject(error); } else { resolve(length); }
                });
            } else {
                this.ftp_client.append(buffer.slice(offset, offset + length), filename, (error: any) => {
                    if (error) { reject(error); } else { resolve(length); }
                });
            }
        });
    }

    async close(handle: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.openedFiles[handle]) {
                reject(new Error('handle no exits'));
                return;
            }
            delete this.openedFiles[handle];
            delete this.openedFileBuffers[handle];
            resolve(true);
        });
    }

    async unlink(path: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.ftp_client.delete(path, (error: any) => {
                if (error) { reject(error); } else { resolve(true); }
            });
        });
    }

    async exists(path: string): Promise<boolean> {
        try {
            const stats = await this.stat(path);
            if (stats) {
                return true;
            }
        } catch (e) {
        }
        return false;
    }

    async syncRemoteToLocal(remote_path: string, local_file: string): Promise<void> {
        const local_path = path.join(os.tmpdir(), local_file);
        return new Promise((resolve, reject) => {
            this.ftp_client.get(remote_path, (err: any, stream: any) => {
                if (err) {
                    reject(err);
                } else {
                    stream.once('close', () => { resolve(); });
                    stream.once('error', (error: any) => { reject(error); });
                    stream.pipe(fs.createWriteStream(local_path));
                }
            });
        });
    }

    async syncLocalToRemote(remote_path: string, local_file: string): Promise<void> {
        const local_path = path.join(os.tmpdir(), local_file);
        return new Promise((resolve, reject) => {
            this.ftp_client.put(local_path, remote_path, (error: any) => {
                if (error) { reject(); } else { resolve(); }
            });
        });
    }

    async syncGetLocalFileContent(local_file: string): Promise<Buffer> {
        const local_path = path.join(os.tmpdir(), local_file);
        return fs.readFileSync(local_path);
    }

    async syncWriteLocalFileContent(local_file: string, v: any): Promise<void> {
        const local_path = path.join(os.tmpdir(), local_file);
        return fs.writeFileSync(local_path, v);
    }

    dispose() {
        for (var index in this.openedFiles) {
            this.close(parseInt(index));
        }
        this.parent.closeConnection(this.connId);
        this.emit("dispose");
        this.removeAllListeners();
    }
}

export { FTPFileSystem };
