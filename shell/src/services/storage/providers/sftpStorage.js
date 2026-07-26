/**
 * SFTP 存储 Provider
 */
import StorageProviderInterface from "../storageInterface";

class SFTPStorage extends StorageProviderInterface {
    config = null;
    basePath = "";
    status = "offline";
    sftpHandle = null;
    service = null;

    /**
     * @param {Object} config
     * @param {string} config.host - SFTP 服务器地址
     * @param {number} [config.port] - 端口，默认 22
     * @param {string} config.username - 用户名
     * @param {string} [config.password] - 密码
     * @param {string} [config.authType] - 认证类型: password | publickey
     * @param {string} [config.privateKey] - 私钥路径
     * @param {string} [config.passphrase] - 私钥密码
     * @param {string} [config.basePath] - 基础路径，默认 ~/.nxshell
     */
    constructor(config) {
        super("SFTPStorage");

        console.log("[SFTPStorage] constructor config:", config);

        if (!config || !config.host) {
            throw new Error("SFTP host is required");
        }

        this.config = {
            host: config.host,
            port: parseInt(config.port, 10) || 22,
            username: config.username || "",
            password: config.password || "",
            authType: config.authType || "password",
            privateKey: config.privateKey || "",
            passphrase: config.passphrase || ""
        };

        console.log("[SFTPStorage] parsed config:", this.config);

        this.basePath = config.basePath || ".nxshell";
        this.service = window.powertools.getService();
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
        } catch (e) {
            this.status = "error";
            throw new Error(`SFTP connect failed: ${e.message}`);
        }
    }

    /**
     * 确保基础路径存在
     */
    async _ensureBasePath() {
        try {
            const exists = await this.service.callObject(this.sftpHandle, "exists", this.basePath);
            if (!exists) {
                await this.service.callObject(this.sftpHandle, "mkdir", this.basePath);
            }
        } catch (e) {
            console.warn("SFTP ensure base path failed:", e);
        }
    }

    /**
     * 获取完整路径
     * @param {string} name 
     */
    _getFullPath(name) {
        return `${this.basePath}/${name}.json`;
    }

    /**
     * 保存数据
     * @param {string} name 
     * @param {Object} object 
     */
    async save(name, object) {
        await this._getClient();
        const filePath = this._getFullPath(name);
        const content = JSON.stringify(object, null, 2);

        try {
            // 使用 SFTPFileSystem.writeFileContent，Buffer 在后端内部处理
            await this.service.callObject(this.sftpHandle, "writeFileContent", filePath, content);
            this.status = "online";
        } catch (e) {
            this.status = "error";
            throw new Error(`SFTP save failed: ${e.message}`);
        }
    }

    /**
     * 读取数据
     * @param {string} name 
     * @returns {Object|null}
     */
    async read(name) {
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
        } catch (e) {
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
    async delete(name) {
        await this._getClient();
        const filePath = this._getFullPath(name);

        try {
            const exists = await this.service.callObject(this.sftpHandle, "exists", filePath);
            if (exists) {
                await this.service.callObject(this.sftpHandle, "unlink", filePath);
            }
            this.status = "online";
        } catch (e) {
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
                .filter(item => item.name.endsWith(".json"))
                .map(item => item.name.replace(".json", ""));
        } catch (e) {
            this.status = "error";
            throw new Error(`SFTP list failed: ${e.message}`);
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
        } catch (e) {
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
    getStatus() {
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
