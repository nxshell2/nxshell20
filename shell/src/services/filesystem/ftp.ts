import { PtSFTPFileSystemClient } from "../../../common/filesystem/filesystem";
import { FStats } from "../../../common/filesystem/fstat";
import WaitObject from "../../../common/utils/waitObject";

class Dirent extends FStats {
    name = ""
    stat: any = null;
    
    constructor(name: string, stat: any) {
        super(stat);
        this.name = name;
        this.stat = stat;
    }

    isBlockDevice() {
        return false;
    }

    isCharacterDevice() {
        return false;
    }

    isDirectory() {
        return (this.stats as any).type === 'd';
    }

    isFIFO() {
        return false;
    }

    isFile() {
        return (this.stats as any).type === '-';
    }

    isSocket() {
        return false;
    }

    isSymbolicLink() {
        return (this.stats as any).type === 'l';
    }

    getUid() {
        return (this.stats as any).owner;
    }

    getGid() {
        return (this.stats as any).group;
    }

    getSize() {
        return this.stats.size;
    }

    getATime(): any {
        return new Date((this.stats as any).date);
    }

    getMTime(): any {
        console.log('时间',new Date((this.stats as any).date))
        return new Date((this.stats as any).date);
    }

    getPermsString() {
        return (this.stats as any).rights.user + (this.stats as any).rights.group + (this.stats as any).rights.other;
    }
}

export class FTPFileSystem extends PtSFTPFileSystemClient {
    serviceProxy: any = null;
    service: any = null;
    initialized: any = null;
    constructor(handle: any) {
        super(handle);
        this.service = powertools.getService();
    }

    async init() {
        if (this.initialized) {
            await this.initialized.wait();
            return;
        }
        this.initialized = new WaitObject();
        try {
            await this.service.callObject(this.handle, 'init');
            this.initialized.resolve()
        } catch (err) {
            this.initialized.reject(err);
        }
    }
    async getconn() {
        return await this.service.callObject(this.handle, 'getconn');
    }

    async open(fileName: any, flags: any) {
        return await this.service.callObject(this.handle, 'open', ...[fileName, flags]);
    }

    async readdir(location: any) {
        const dirList = await this.service.callObject(this.handle, 'readdir', location);
        return dirList.map((dirent: any) => {
            return new Dirent(dirent.name, dirent)
        });
    }

    async lstat(path: any) {
        const stat = await this.service.callObject(this.handle, "lstat", path);
        return stat;
    }

    async mkdir(path: any, attrs?: any) {
        return await this.service.callObject(this.handle, "mkdir", path, attrs);
    }

    async rmdir(path: any) {
        return await this.service.callObject(this.handle, "rmdir", path);
    }

    async unlink(path: any) {
        return await this.service.callObject(this.handle, "unlink", path);
    }

    async readFileContent(local_file: any) {
        return await this.service.callObject(this.handle, "syncGetLocalFileContent", local_file);
    }

    async writeFileContent(local_file: any, v: any) {
        return await this.service.callObject(this.handle, "syncWriteLocalFileContent", local_file, v);
    }

    async syncLocalToRemote(remote: any, local: any) {
        return await this.service.callObject(this.handle, "syncLocalToRemote", remote, local);
    }

    async syncRemoteToLocal(remote: any, local: any) {
        return await this.service.callObject(this.handle, "syncRemoteToLocal", remote, local);
    } 

    async dispose() {
        this.service.closeObject(this.handle);
    }
}
