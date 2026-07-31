import { PtSFTPFileSystemClient } from "../../../common/filesystem/filesystem";
import { Dirent } from "../../../common/filesystem/dirent";
import WaitObject from "../../../common/utils/waitObject";

export class SFTPFileSystem extends PtSFTPFileSystemClient {
    /**
     * @type {WaitObject}
     */
    initialized: any = null;
    service: any = null;
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
            return new Dirent(dirent.name, dirent.stats)
        });
    }

    async lstat(path: any) {
        const stat = await this.service.callObject(this.handle, "lstat", path);
        return stat;
    }

    async realpath(path: any) {
        const p = await this.service.callObject(this.handle, "realpath", path);
        return p;
    }

    async mkdir(path: any, attrs?: any) {
        return await this.service.callObject(this.handle, "mkdir", path, attrs);
    }

    async rmdir(path: any) {
        return await this.service.callObject(this.handle, "rmdir", path);
    }

    async rename(srcPath: any, destPath: any) {
        return await this.service.callObject(this.handle, "rename", srcPath, destPath);
    }

    async unlink(path: any) {
        return await this.service.callObject(this.handle, "unlink", path);
    }

    async readlink(path: any) {
        return await this.service.callObject(this.handle, "readlink", path);
    }

    async exists(path: any) {
        return await this.service.callObject(this.handle, "exists", path);
    }

    async chmod(path: any, permission: any) {
        return await this.service.callObject(this.handle, "chmod", path, permission);
    }

    async dispose() {
        this.service.closeObject(this.handle);
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
}
