import { encrypt, decrypt } from '../common/utils/encrypt';
import * as fs from 'fs';
import * as path from 'path';
import { createObjectHandle } from "./nxobjs";

class FileStorage {
    constructor() {
    }

    async save(name: string, object: any): Promise<void> {
        let real_dir = path.dirname(name);
        try {
            fs.accessSync(real_dir, fs.constants.F_OK);
        } catch (e) {
            fs.mkdirSync(real_dir);
        }
        const encrypted = encrypt(JSON.stringify(object));
        fs.writeFileSync(name, JSON.stringify(encrypted));
    }

    async read(name: string): Promise<any> {
        let rawVal: string | null = null;
        try {
            rawVal = fs.readFileSync(name, { encoding: 'utf8' }).trim();
        } catch (e) {
            return null;
        }
        if (!rawVal) {
            return null;
        }
        try {
            const parsed = JSON.parse(rawVal);
            if (parsed && typeof parsed === 'object' && parsed.iv && parsed.content) {
                const decrypted = decrypt(parsed);
                let data = JSON.parse(decrypted);
                if (typeof data === 'string') {
                    data = JSON.parse(data);
                }
                return data;
            }
            return parsed;
        } catch (e) {
            return null;
        }
    }

    async export(src: string, dst: string): Promise<boolean> {
        fs.copyFileSync(src, dst);
        return true;
    }

    async import(src: string, dst: string): Promise<boolean> {
        fs.copyFileSync(src, dst);
        return true;
    }

    async path_exists(file_path: string): Promise<boolean> {
        if (fs.existsSync(file_path)) {
            return true;
        }
        return false;
    }

    async listDir(dirPath: string): Promise<{ name: string; isDir: boolean }[]> {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            return entries.map(entry => ({
                name: entry.name,
                isDir: entry.isDirectory()
            }));
        } catch (e) {
            return [];
        }
    }

    async readFile(filePath: string): Promise<string> {
        try {
            return fs.readFileSync(filePath, { encoding: 'utf8' });
        } catch (e) {
            return "";
        }
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        let real_dir = path.dirname(filePath);
        try {
            fs.accessSync(real_dir, fs.constants.F_OK);
        } catch (e) {
            fs.mkdirSync(real_dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, { encoding: 'utf8' });
    }

    async createDir(dirPath: string): Promise<void> {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    async deleteFile(filePath: string): Promise<void> {
        try {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                fs.rmSync(filePath, { recursive: true });
            } else {
                fs.unlinkSync(filePath);
            }
        } catch (e) {
        }
    }

    async move(from: string, to: string): Promise<void> {
        let real_dir = path.dirname(to);
        try {
            fs.accessSync(real_dir, fs.constants.F_OK);
        } catch (e) {
            fs.mkdirSync(real_dir, { recursive: true });
        }
        fs.renameSync(from, to);
    }
}

function createFileStorage(): number {
    const file_storage = new FileStorage();
    const handler = createObjectHandle(file_storage);
    return handler;
}

export { createFileStorage };
