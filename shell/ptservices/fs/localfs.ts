import * as fs from 'fs';
import * as path from 'path';
import { PtFileSystem } from "../../common/filesystem/filesystem";
import { IdGenerator } from "../../common/utils/idGenerator";

class LOCALFileSystem extends PtFileSystem {
    openedFiles: any = null;
    cwd: string = './';
    parent: any = null;
    handleGenerator: IdGenerator = new IdGenerator(1);

    constructor(parent: any) {
        super();
        this.parent = parent;
        this.openedFiles = Object.create(null);
    }

    async init() {
        return true;
    }

    async readdir(location: string): Promise<any> {
        return await new Promise((resolve, reject) => {
            fs.readdir(location || this.cwd, { withFileTypes: true }, (error, list) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(list);
                }
            });
        });
    }

    async stat(path: string): Promise<any> {
        return await new Promise((resolve, reject) => {
            fs.stat(path || this.cwd, (error, stats) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stats);
                }
            });
        });
    }

    async lstat(path: string): Promise<any> {
        return await new Promise((resolve, reject) => {
            fs.lstat(path || this.cwd, (error, stats) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stats);
                }
            });
        });
    }

    async rename(src: string, dest: string): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            fs.rename(src, dest, (error) => {
                if (error) { reject(error); } else { resolve(true); }
            });
        });
    }

    async mkdir(path: string, attrs?: any): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            fs.mkdir(path, attrs || {}, (error) => {
                if (error) { reject(error); } else { resolve(true); }
            });
        });
    }

    async rmdir(path: string, opt?: any): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            fs.rmdir(path, opt || {}, (error) => {
                if (error) { reject(error); } else { resolve(true); }
            });
        });
    }

    async open(filename: string, flags: string): Promise<number> {
        return await new Promise((resolve, reject) => {
            fs.open(filename, flags, (error, fd) => {
                if (error) {
                    reject(error);
                } else {
                    let retHanlde = this.handleGenerator.getNext();
                    this.openedFiles[retHanlde] = fd;
                    resolve(retHanlde);
                }
            });
        });
    }

    async read(handle: number, buffer: Buffer, offset: number, length: number, position: number): Promise<{ bytesRead: number; buffer: Buffer }> {
        return await new Promise((resolve, reject) => {
            if (!this.openedFiles[handle]) {
                reject(new Error('Invalid file handle:' + handle));
                return;
            }
            fs.read(this.openedFiles[handle], buffer, offset, length, position, (error, bytesRead, buff) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ bytesRead, buffer: buff });
                }
            });
        });
    }

    async write(handle: number, buffer: Buffer, offset: number, lenght: number, position: number): Promise<number> {
        return await new Promise((resolve, reject) => {
            if (!this.openedFiles[handle]) {
                reject(new Error("Invalid file handle"));
                return;
            }
            fs.write(this.openedFiles[handle], buffer, offset, lenght, position, (err, bytesWrite, buff) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(bytesWrite);
            });
        });
    }

    async close(handle: number): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            if (!this.openedFiles[handle]) {
                reject(new Error('Invalid file handle:' + handle));
                return;
            }
            fs.close(this.openedFiles[handle], (error) => {
                if (error) {
                    reject(error);
                } else {
                    delete this.openedFiles[handle];
                    resolve(true);
                }
            });
        });
    }

    async unlink(path: string): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            fs.unlink(path, (error) => {
                if (error) { reject(error); } else { resolve(true); }
            });
        });
    }

    async exists(path: string): Promise<boolean> {
        try {
            await this.stat(path);
        } catch (e: any) {
            if (e.code === "ENOENT") {
                return false;
            }
        }
        return true;
    }

    async pathresolve(path1: string, path2: string): Promise<string> {
        return path.resolve(path1, path2);
    }

    async basename(path1: string): Promise<string> {
        return path.basename(path1);
    }

    dispose() {
        for (let index in this.openedFiles) {
            this.close(parseInt(index));
        }
        this.emit("dispose");
        this.removeAllListeners();
    }
}

export { LOCALFileSystem };
