/**
 * SFTP 存储 Provider
 */
import StorageProviderInterface from "../storageInterface";
import { ShellConfig } from "../../sessionManage/shellConfig";

interface SFTPEntry {
    name: string;
    isDirectory?(): boolean;
    stats?: { mode?: number };
}

interface SFTPRuntimeConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    authType: string;
    privateKey: string;
    passphrase: string;
    basePath: string;
}

class SFTPStorage extends StorageProviderInterface {
    config: SFTPRuntimeConfig = {
        host: "",
        port: 22,
        username: "",
        password: "",
        authType: "password",
        privateKey: "",
        passphrase: "",
        basePath: ""
    };
    basePath: string = "";
    status: string = "offline";
    sftpHandle: string | number | null = null;
    service: any = null;

    /**
     * @param {ShellConfig} config
     * @param {string} config.host - SFTP 服务器地址
     * @param {number} [config.port] - 端口，默认 22
     * @param {string} config.username - 用户名
     * @param {string} [config.password] - 密码
     * @param {string} [config.authType] - 认证类型: password | publickey
     * @param {string} [config.privateKey] - 私钥路径
     * @param {string} [config.passphrase] - 私钥密码
     * @param {string} [config.basePath] - 基础路径，默认 ~/.nxshell
     */
    constructor(config: ShellConfig | null) {
        super("SFTPStorage");

        console.log("[SFTPStorage] constructor config:", config);

        if (!config || !config.host) {
            throw new Error("SFTP host is required");
        }

        this.config = {
            host: config.host as string,
            port: Number(config.port) || 22,
            username: config.username || "",
            password: config.password || "",
            authType: config.authType || "password",
            privateKey: config.privateKey || "",
            passphrase: config.passphrase || "",
            basePath: config.basePath || ".nxshell"
        };

        console.log("[SFTPStorage] parsed config:", this.config);

        this.basePath = this.config.basePath;
        this.service = (window as any).powertools.getService();
    }

    /**
     * 获取 SFTP 连接
     */
    async _getClient() {
        if (this.sftpHandle) {
            return this.sftpHandle;
        }

        try {
            // 使用后端 createStandaloneSFTP 创建独立连接
            this.sftpHandle = await this.service.createStandaloneSFTP(this.config);
            this.status = "online";
            
            // 确保基础路径存在
            await this._ensureBasePath();
            
            return this.sftpHandle;
        } catch (e: any) {
            this.status = "error";
            throw new Error(`SFTP connect failed: ${e.message}`);
        }
    }

    async _exists(p: string): Promise<boolean> {
        try {
            return await this.service.callObject(this.sftpHandle, "exists", p);
        } catch (e: any) {
            return false;
        }
    }

    async _ensureDir(dirPath: string): Promise<void> {
        if (await this._exists(dirPath)) {
            return;
        }
        const isAbs = dirPath.startsWith("/");
        const parts = dirPath.split("/").filter((p) => p.length > 0);
        for (let i = 0, len = parts.length; i < len; i++) {
            const current = (isAbs ? "/" : "") + parts.slice(0, i + 1).join("/");
            if (await this._exists(current)) {
                continue;
            }
            await this.service.callObject(this.sftpHandle, "mkdir", current);
        }
    }

    /**
     * 确保基础路径存在
     */
    async _ensureBasePath() {
        if (!this.basePath) {
            return;
        }
        try {
            await this._ensureDir(this.basePath);
        } catch (e: any) {
            console.warn("SFTP ensure base path failed:", e);
        }
    }

    /**
     * 获取完整路径
     * @param {string} name 
     */
    _getFullPath(name: string) {
        return `${this.basePath}/${name}.json`;
    }

    /**
     * 保存数据
     * @param {string} name 
     * @param {Object} object 
     */
    async save(name: string, object: any) {
        await this._getClient();
        const filePath = this._getFullPath(name);
        const content = JSON.stringify(object, null, 2);

        try {
            // 使用 SFTPFileSystem.writeFileContent，Buffer 在后端内部处理
            await this.service.callObject(this.sftpHandle, "writeFileContent", filePath, content);
            this.status = "online";
        } catch (e: any) {
            this.status = "error";
            throw new Error(`SFTP save failed: ${e.message}`);
        }
    }

    /**
     * 读取数据
     * @param {string} name 
     * @returns {Object|null}
     */
    async read(name: string) {
        await this._getClient();
        const filePath = this._getFullPath(name);

        try {
            const exists = await this.service.callObject(this.sftpHandle, "exists", filePath);
            if (!exists) {
                return null;
            }

            // 使用 SFTPFileSystem.readFileContent，Buffer 在后端内部处理
            const content = await this.service.callObject(this.sftpHandle, "readFileContent", filePath);
            this.status = "online";
            
            if (!content || content.trim() === '') {
                return null;
            }
            
            return JSON.parse(content);
        } catch (e: any) {
            if (e.code === "ENOENT" || e.message?.includes("No such file")) {
                return null;
            }
            if (e.message?.includes("JSON") || e.message?.includes("Unexpected end")) {
                console.warn("SFTP file content is not valid JSON, returning null");
                return null;
            }
            this.status = "error";
            throw new Error(`SFTP read failed: ${e.message}`);
        }
    }

    /**
     * 删除数据
     * @param {string} name 
     */
    async delete(name: string) {
        await this._getClient();
        const filePath = this._getFullPath(name);

        try {
            const exists = await this.service.callObject(this.sftpHandle, "exists", filePath);
            if (exists) {
                await this.service.callObject(this.sftpHandle, "unlink", filePath);
            }
            this.status = "online";
        } catch (e: any) {
            this.status = "error";
            throw new Error(`SFTP delete failed: ${e.message}`);
        }
    }

    /**
     * 列出所有配置
     * @returns {string[]}
     */
    async list() {
        await this._getClient();

        try {
            // SFTPFileSystem.readdir 返回 Dirent 对象数组
            const items = await this.service.callObject(this.sftpHandle, "readdir", this.basePath);
            this.status = "online";
            return items
                .filter((item: SFTPEntry) => item.name.endsWith(".json"))
                .map((item: SFTPEntry) => item.name.replace(".json", ""));
        } catch (e: any) {
            this.status = "error";
            throw new Error(`SFTP list failed: ${e.message}`);
        }
    }

    /**
     * 列出目录内容
     * @param {string} dirPath 
     * @returns {{name: string; isDir: boolean}[]}
     */
    async listDir(dirPath: string) {
        await this._getClient();
        try {
            const items = await this.service.callObject(this.sftpHandle, "readdir", dirPath);
            return (items as SFTPEntry[]).map((item: SFTPEntry) => {
                let isDir = false;
                if (typeof item.isDirectory === 'function') {
                    isDir = item.isDirectory();
                } else if (item.stats && item.stats.mode !== undefined) {
                    // IPC 序列化后方法丢失，通过 mode 位判断
                    isDir = ((item.stats.mode & 0o170000) === 0o040000);
                }
                return {
                    name: item.name,
                    isDir
                };
            });
        } catch (e: any) {
            if (e.code === "ENOENT" || e.message?.includes("No such file")) {
                return [];
            }
            throw new Error(`SFTP listDir failed: ${e.message}`);
        }
    }

    /**
     * 读取文件内容（文本）
     * @param {string} filePath 
     * @returns {string|null}
     */
    async readFile(filePath: string) {
        await this._getClient();
        try {
            const exists = await this.service.callObject(this.sftpHandle, "exists", filePath);
            if (!exists) {
                return null;
            }
            const content = await this.service.callObject(this.sftpHandle, "readFileContent", filePath);
            if (!content || content.trim() === '') {
                return null;
            }
            return content;
        } catch (e: any) {
            if (e.code === "ENOENT" || e.message?.includes("No such file")) {
                return null;
            }
            throw new Error(`SFTP readFile failed: ${e.message}`);
        }
    }

    /**
     * 写入文本文件
     * @param {string} filePath 
     * @param {string} content 
     */
    async writeFile(filePath: string, content: string) {
        await this._getClient();
        try {
            await this.service.callObject(this.sftpHandle, "writeFileContent", filePath, content);
            this.status = "online";
        } catch (e: any) {
            this.status = "error";
            throw new Error(`SFTP writeFile failed: ${e.message}`);
        }
    }

    /**
     * 递归创建目录
     * @param {string} dirPath 
     */
    async createDir(dirPath: string) {
        await this._getClient();
        try {
            await this._ensureDir(dirPath);
            this.status = "online";
        } catch (e: any) {
            this.status = "error";
            throw new Error(`SFTP createDir failed: ${e.message}`);
        }
    }

    /**
     * 删除文件
     * @param {string} filePath 
     */
    async deleteFile(filePath: string) {
        await this._getClient();
        try {
            const exists = await this.service.callObject(this.sftpHandle, "exists", filePath);
            if (exists) {
                await this.service.callObject(this.sftpHandle, "unlink", filePath);
            }
            this.status = "online";
        } catch (e: any) {
            this.status = "error";
            throw new Error(`SFTP deleteFile failed: ${e.message}`);
        }
    }

    /**
     * 移动/重命名文件
     * @param {string} from 
     * @param {string} to 
     */
    async move(from: string, to: string) {
        await this._getClient();
        try {
            // SFTP rename 不能跨卷，但在同一连接内通常可用
            await this.service.callObject(this.sftpHandle, "rename", from, to);
            this.status = "online";
        } catch (e: any) {
            this.status = "error";
            throw new Error(`SFTP move failed: ${e.message}`);
        }
    }

    /**
     * 测试连接
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async testConnection() {
        try {
            await this._getClient();
            return { success: true, message: "SFTP 连接成功" };
        } catch (e: any) {
            const msg = e.message || "";
            if (msg.includes("Authentication") || msg.includes("auth")) {
                return { success: false, message: "认证失败，请检查用户名和密码" };
            }
            if (msg.includes("ECONNREFUSED") || msg.includes("connect")) {
                return { success: false, message: "连接被拒绝，请检查地址和端口" };
            }
            if (msg.includes("私钥")) {
                return { success: false, message: msg };
            }
            return { success: false, message: msg || "连接失败" };
        }
    }

    /**
     * 获取状态
     */
    async getStatus() {
        return this.status;
    }

    /**
     * 关闭连接
     */
    async close() {
        if (this.sftpHandle) {
            try {
                // SFTPFileSystem.dispose 会关闭 sftp 和连接
                await this.service.closeObject(this.sftpHandle);
            } catch (e) {
                // ignore
            }
            this.sftpHandle = null;
            this.status = "offline";
        }
    }
}

export default SFTPStorage;
