import * as path from "path";
import { EventEmitter } from "events";

class PtFileSystem extends EventEmitter {
    name: string = "ptfs";
    constructor(name?: string) {
        super();
        if (name) this.name = name;
    }

    async getconn() {
        return -1;
    }

    async open(name: string, flags: any) {
        throw new Error("Unimplemented");
    }
    async close(handle: any) {
        throw new Error("Unimplemented");
    }
    async read(handle: any, buffer: any, offset: number, length: number, position: number) {
        throw new Error("Unimplemented");
    }
    async write(handle: any, buffer: any, offset: number, length: number, position: number) {
        throw new Error("Unimplemented");
    }
    async fstat(handle: any) {
        throw new Error("Unimplemented");
    }
    async fsetstat(handle: any, attr: any) {
        throw new Error("Unimplemented");
    }
    async futimes(handle: any, atime: number, mtime: number) {
        throw new Error("Unimplemented");
    }
    async fchown(handle: any, uid: number, gid: number) {
        throw new Error("Unimplemented");
    }
    async fchmod(handle: any, mode: number) {
        throw new Error("Unimplemented");
    }
    async opendir(path: string) {
        throw new Error("Unimplemented");
    }
    async readdir(location: string) {
        throw new Error("Unimplemented");
    }
    async unlink(path: string) {
        throw new Error("Unimplemented");
    }
    async rename(srcPath: string, destPath: string) {
        throw new Error("Unimplemented");
    }
    async mkdir(path: string, attr?: any) {
        throw new Error("Unimplemented");
    }
    async rmdir(path: string) {
        throw new Error("Unimplemented");
    }
    async stat(path: string) {
        throw new Error("Unimplemented");
    }
    async lstat(path: string) {
        throw new Error("Unimplemented");
    }
    async setstat(path: string, attr: any) {
        throw new Error("Unimplemented");
    }
    async utimes(path: string, atime: number, mtime: number) {
        throw new Error("Unimplemented");
    }
    async chown(path: string, uid: number, gid: number) {
        throw new Error("Unimplemented");
    }
    async chmod(path: string, mode: number) {
        throw new Error("Unimplemented");
    }
    async readlink(path: string) {
        throw new Error("Unimplemented");
    }
    async symlink(targetPath: string, linkPath: string) {
        throw new Error("Unimplemented");
    }
    async realpath(path: string) {
        throw new Error("Unimplemented");
    }

    async exists(path: string) {
        throw new Error("Unimplemented");
    }

    async walk(rootDir: string, deepFirst: boolean = true) {
        const result: any[] = [];
        if (!deepFirst) {
            result.push({
                isDir: true,
                entryPath: rootDir
            });
        }
        const walk = async (dirPath: string) => {
            const fileList = await this.readdir(dirPath);
            if (deepFirst) {
                for (let i = 0; i < fileList.length; i++) {
                    const dirent = fileList[i];
                    const entryPath = path.resolve(dirPath, dirent.name);
                    let isDir = false;
                    if (dirent.isDirectory()) {
                        await walk(entryPath);
                        isDir = true;
                    }
                    result.push({
                        isDir,
                        entryPath
                    });
                }
            } else {
                for (let i = 0; i < fileList.length; i++) {
                    const dirent = fileList[i];
                    const entryPath = path.resolve(dirPath, dirent.name);
                    const folderList: string[] = [];
                    let isDir = false;
                    if (dirent.isDirectory()) {
                        folderList.push(entryPath);
                        isDir = true;
                    }
                    result.push({
                        isDir,
                        entryPath
                    });
                    for (let j = 0; j < folderList.length; j++) {
                        await walk(folderList[j]);
                    }
                }
            }
        };

        await walk(rootDir);
        if (deepFirst) {
            result.push({
                isDir: true,
                entryPath: rootDir
            });
        }

        return result;
    }
}

class PtSFTPFileSystemClient extends PtFileSystem {
    handle: any = null;
    constructor(handle: any) {
        super("sftpfs");
        this.handle = handle;
    }

    async init() {
        throw new Error("Unimplemented");
    }

    async remove(filePath: string) {
        return await this.unlink(filePath);
    }
}

export {
    PtFileSystem,
    PtSFTPFileSystemClient
};
