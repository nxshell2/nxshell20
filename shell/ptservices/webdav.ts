const webdav: any = require("webdav");
const { createClient, AuthType } = webdav;

import { PtFileSystem } from "../common/filesystem/filesystem";

class WDFileSystem extends PtFileSystem {
    openedFiles: any = null;
    webDavClient: any = null;
    cwd: string = './';
    authConfig: any = null;

    constructor(sessConfig: any) {
        super();
        this.openedFiles = Object.create(null);
        this.authConfig = sessConfig;
    }

    async connect(): Promise<boolean> {
        let url = this.authConfig.url;
        let options = {
            authType: AuthType.Password,
            username: this.authConfig.username,
            password: this.authConfig.password
        };
        this.webDavClient = createClient(url, options);
        return true;
    }

    async readdir(location: string): Promise<any> {
        let list = await this.webDavClient.getDirectoryContents(location);
        return list;
    }

    async stat(path: string): Promise<any> {
        let s = await this.webDavClient.stat(path);
        return s;
    }

    async lstat(path: string): Promise<any> {
        return await this.stat(path);
    }

    async rename(src: string, dest: string): Promise<boolean> {
        await this.webDavClient.copyFile(src, dest);
        return true;
    }

    async mkdir(path: string, attrs?: any): Promise<boolean> {
        await this.webDavClient.createDirectory(path);
        return true;
    }

    async rmdir(path: string): Promise<boolean> {
        await this.unlink(path);
        return true;
    }

    async open(filename: string, flags: any): Promise<string> {
        let readStrem = await this.webDavClient.createReadStream(filename);
        this.openedFiles[filename] = readStrem;
        return filename;
    }

    async read(handle: any, buffer: Buffer, offset: number, length: number, position: number) {
    }

    async close(handle: any): Promise<boolean> {
        if (!this.openedFiles[handle]) {
            return false;
        }
        this.openedFiles[handle].destroy();
        delete this.openedFiles[handle];
        return true;
    }

    async unlink(path: string): Promise<boolean> {
        await this.webDavClient.deleteFile(path);
        return true;
    }

    dispose() {
        for (var index in this.openedFiles) {
            this.close(index);
        }
        if (this.webDavClient) {
            this.webDavClient = null;
        }
    }
}

export { WDFileSystem };
