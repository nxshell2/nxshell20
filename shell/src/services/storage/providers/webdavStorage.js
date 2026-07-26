/**
 * WebDAV 存储 Provider
 */
import StorageProviderInterface from "../storageInterface";
import { createClient } from "webdav";

class WebDAVStorage extends StorageProviderInterface {
    client = null;
    basePath = "";
    status = "offline";

    /**
     * @param {Object} config
     * @param {string} config.url - WebDAV 服务器 URL
     * @param {string} config.username - 用户名
     * @param {string} config.password - 密码
     * @param {string} [config.basePath] - 基础路径，默认 /nxshell
     */
    constructor(config) {
        super("WebDAVStorage");

        if (!config || !config.url) {
            throw new Error("WebDAV URL is required");
        }

        this.basePath = config.basePath || "/nxshell";

        // 创建 WebDAV 客户端
        this.client = createClient(config.url, {
            username: config.username || "",
            password: config.password || ""
        });

        this._ensureBasePath();
    }

    /**
     * 确保基础路径存在
     */
    async _ensureBasePath() {
        try {
            const exists = await this.client.exists(this.basePath);
            if (!exists) {
                await this.client.createDirectory(this.basePath, { recursive: true });
            }
            this.status = "online";
        } catch (e) {
            console.error("WebDAV ensure base path failed:", e);
            this.status = "error";
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
        const path = this._getFullPath(name);
        const content = JSON.stringify(object, null, 2);

        try {
            await this.client.putFileContents(path, content, {
                contentLength: Buffer.byteLength(content, "utf8"),
                overwrite: true
            });
            this.status = "online";
        } catch (e) {
            this.status = "error";
            throw new Error(`WebDAV save failed: ${e.message}`);
        }
    }

    /**
     * 读取数据
     * @param {string} name 
     * @returns {Object|null}
     */
    async read(name) {
        const path = this._getFullPath(name);

        try {
            const exists = await this.client.exists(path);
            if (!exists) {
                return null;
            }

            const content = await this.client.getFileContents(path, {
                format: "text"
            });

            this.status = "online";
            return JSON.parse(content);
        } catch (e) {
            if (e.status === 404) {
                return null;
            }
            this.status = "error";
            throw new Error(`WebDAV read failed: ${e.message}`);
        }
    }

    /**
     * 删除数据
     * @param {string} name 
     */
    async delete(name) {
        const path = this._getFullPath(name);

        try {
            const exists = await this.client.exists(path);
            if (exists) {
                await this.client.deleteFile(path);
            }
            this.status = "online";
        } catch (e) {
            this.status = "error";
            throw new Error(`WebDAV delete failed: ${e.message}`);
        }
    }

    /**
     * 列出所有配置
     * @returns {string[]}
     */
    async list() {
        try {
            const items = await this.client.getDirectoryContents(this.basePath);
            this.status = "online";
            return items
                .filter(item => item.type === "file" && item.basename.endsWith(".json"))
                .map(item => item.basename.replace(".json", ""));
        } catch (e) {
            this.status = "error";
            throw new Error(`WebDAV list failed: ${e.message}`);
        }
    }

    /**
     * 测试连接
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async testConnection() {
        try {
            // 尝试获取根目录
            await this.client.getDirectoryContents("/");
            this.status = "online";
            return { success: true, message: "WebDAV 连接成功" };
        } catch (e) {
            this.status = "error";
            if (e.status === 401) {
                return { success: false, message: "认证失败，请检查用户名和密码" };
            }
            if (e.status === 404) {
                return { success: false, message: "路径不存在" };
            }
            return { success: false, message: e.message || "连接失败" };
        }
    }

    /**
     * 获取状态
     */
    getStatus() {
        return this.status;
    }
}

export default WebDAVStorage;
