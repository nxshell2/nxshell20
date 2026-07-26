/**
 * 挂载点管理器
 * 
 * 管理多个配置源（本地、WebDAV、SFTP等）
 */
import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";
import LocalFileStorage from "./localFileSystem";

// 挂载点类型
export const MOUNT_TYPES = {
    LOCAL: "local",
    WEBDAV: "webdav",
    SFTP: "sftp",
    S3: "s3"
};

// 默认本地挂载点
const DEFAULT_LOCAL_MOUNT = {
    id: "local",
    name: "本地会话",
    type: MOUNT_TYPES.LOCAL,
    icon: "folder",
    readonly: false,
    order: 0
};

/**
 * 挂载点配置类
 */
export class MountConfig {
    id = "";
    name = "";
    type = MOUNT_TYPES.LOCAL;
    icon = "folder";
    readonly = false;
    order = 0;
    config = null;  // 远程配置（url、认证等）
    status = "online";  // online | offline | loading | error

    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.name = data.name || "";
        this.type = data.type || MOUNT_TYPES.LOCAL;
        this.icon = data.icon || this._getDefaultIcon();
        this.readonly = data.readonly || false;
        this.order = data.order || 0;
        this.config = data.config || null;
        // 本地挂载点默认在线，远程挂载点默认加载中
        this.status = this.type === MOUNT_TYPES.LOCAL ? "online" : "loading";
    }

    _getDefaultIcon() {
        switch (this.type) {
            case MOUNT_TYPES.WEBDAV: return "cloud";
            case MOUNT_TYPES.SFTP: return "server";
            case MOUNT_TYPES.S3: return "cloud-storage";
            default: return "folder";
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            icon: this.icon,
            readonly: this.readonly,
            order: this.order,
            config: this.config
        };
    }

    static fromJSON(data) {
        return new MountConfig(data);
    }
}

/**
 * 挂载点管理器
 */
class MountManager extends EventEmitter {
    /** @type {MountConfig[]} */
    mounts = [];

    /** @type {Map<string, StorageProviderInterface>} */
    providers = new Map();

    /** @type {LocalFileStorage} */
    localStorage = null;

    /** @type {boolean} */
    initialized = false;

    constructor() {
        super();
        this.localStorage = new LocalFileStorage();
    }

    /**
     * 初始化挂载点管理器
     */
    async initialize() {
        if (this.initialized) return;

        // 加载挂载点配置
        await this.loadMounts();

        // 初始化各 provider
        for (const mount of this.mounts) {
            await this._initProvider(mount);
        }

        this.initialized = true;
    }

    /**
     * 加载挂载点配置
     */
    async loadMounts() {
        let mountsData = null;
        try {
            mountsData = await this.localStorage.read("MOUNTS");
        } catch (e) {
            console.log("Load mounts failed:", e);
        }

        if (!mountsData || !Array.isArray(mountsData) || mountsData.length === 0) {
            // 初始化默认本地挂载点
            this.mounts = [MountConfig.fromJSON(DEFAULT_LOCAL_MOUNT)];
            await this.saveMounts();
        } else {
            this.mounts = mountsData.map(m => MountConfig.fromJSON(m));
            // 确保本地挂载点存在
            if (!this.mounts.find(m => m.id === "local")) {
                this.mounts.unshift(MountConfig.fromJSON(DEFAULT_LOCAL_MOUNT));
                await this.saveMounts();
            }
        }

        // 按 order 排序
        this.mounts.sort((a, b) => a.order - b.order);
    }

    /**
     * 保存挂载点配置
     */
    async saveMounts() {
        const data = this.mounts.map(m => m.toJSON());
        await this.localStorage.save("MOUNTS", data);
    }

    /**
     * 初始化单个 provider
     * @param {MountConfig} mount 
     */
    async _initProvider(mount) {
        try {
            const provider = await this._createProvider(mount);
            if (provider) {
                this.providers.set(mount.id, provider);
            }
        } catch (e) {
            console.error(`Init provider failed for mount ${mount.name}:`, e);
            // 不阻塞其他挂载点
        }
    }

    /**
     * 创建 provider 实例
     * @param {MountConfig} mount 
     * @returns {StorageProviderInterface}
     */
    async _createProvider(mount) {
        switch (mount.type) {
            case MOUNT_TYPES.LOCAL:
                return this.localStorage;

            case MOUNT_TYPES.WEBDAV: {
                // 动态导入 WebDAV provider
                const { default: WebDAVStorage } = await import("./providers/webdavStorage");
                return new WebDAVStorage(mount.config);
            }

            case MOUNT_TYPES.SFTP: {
                // 动态导入 SFTP provider
                const { default: SFTPStorage } = await import("./providers/sftpStorage");
                return new SFTPStorage(mount.config);
            }

            case MOUNT_TYPES.S3: {
                // 动态导入 S3 provider (暂不实现)
                console.warn("S3 storage not implemented yet");
                return null;
            }

            default:
                console.warn(`Unknown mount type: ${mount.type}`);
                return null;
        }
    }

    /**
     * 获取所有挂载点
     * @returns {MountConfig[]}
     */
    getMounts() {
        return this.mounts;
    }

    /**
     * 根据 ID 获取挂载点
     * @param {string} mountId 
     * @returns {MountConfig|null}
     */
    getMount(mountId) {
        return this.mounts.find(m => m.id === mountId) || null;
    }

    /**
     * 获取挂载点的 provider
     * @param {string} mountId 
     * @returns {StorageProviderInterface|null}
     */
    getProvider(mountId) {
        return this.providers.get(mountId) || null;
    }

    /**
     * 添加挂载点
     * @param {Object} mountData 
     * @returns {MountConfig}
     */
    async addMount(mountData) {
        const mount = new MountConfig({
            ...mountData,
            id: uuidv4(),
            order: this.mounts.length
        });

        this.mounts.push(mount);
        await this.saveMounts();

        // 初始化 provider
        await this._initProvider(mount);

        this.emit("mount-added", mount);
        return mount;
    }

    /**
     * 更新挂载点
     * @param {string} mountId 
     * @param {Object} updates 
     */
    async updateMount(mountId, updates) {
        const mount = this.getMount(mountId);
        if (!mount) {
            throw new Error(`Mount not found: ${mountId}`);
        }

        // 本地挂载点只能改名称
        if (mountId === "local") {
            if (updates.name !== undefined) {
                mount.name = updates.name;
            }
        } else {
            // 更新字段
            if (updates.name !== undefined) mount.name = updates.name;
            if (updates.icon !== undefined) mount.icon = updates.icon;
            if (updates.readonly !== undefined) mount.readonly = updates.readonly;
            if (updates.config !== undefined) mount.config = updates.config;
        }

        await this.saveMounts();

        // 如果配置变了，重新创建 provider
        if (updates.config !== undefined && mountId !== "local") {
            this.providers.delete(mountId);
            await this._initProvider(mount);
        }

        this.emit("mount-updated", mount);
    }

    /**
     * 删除挂载点
     * @param {string} mountId 
     */
    async removeMount(mountId) {
        if (mountId === "local") {
            throw new Error("不能删除本地配置源");
        }

        const index = this.mounts.findIndex(m => m.id === mountId);
        if (index === -1) {
            throw new Error(`Mount not found: ${mountId}`);
        }

        const mount = this.mounts[index];
        this.mounts.splice(index, 1);
        this.providers.delete(mountId);

        await this.saveMounts();

        this.emit("mount-removed", mount);
    }

    /**
     * 调整挂载点顺序
     * @param {string} mountId 
     * @param {number} newOrder 
     */
    async reorderMount(mountId, newOrder) {
        const mount = this.getMount(mountId);
        if (!mount) return;

        // 移除并插入到新位置
        const index = this.mounts.findIndex(m => m.id === mountId);
        this.mounts.splice(index, 1);
        this.mounts.splice(newOrder, 0, mount);

        // 更新 order
        this.mounts.forEach((m, i) => {
            m.order = i;
        });

        await this.saveMounts();
        this.emit("mounts-reordered", this.mounts);
    }

    /**
     * 测试挂载点连接
     * @param {MountConfig|Object} mount 
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async testConnection(mount) {
        if (mount.type === MOUNT_TYPES.LOCAL) {
            return { success: true, message: "本地存储可用" };
        }

        try {
            const provider = await this._createProvider(
                mount instanceof MountConfig ? mount : new MountConfig(mount)
            );
            if (!provider) {
                return { success: false, message: "不支持的存储类型" };
            }

            if (typeof provider.testConnection === "function") {
                return await provider.testConnection();
            }

            // 尝试读取测试
            await provider.read("__CONNECTION_TEST__");
            return { success: true, message: "连接成功" };
        } catch (e) {
            return { success: false, message: e.message || "连接失败" };
        }
    }

    /**
     * 获取挂载点状态
     * @param {string} mountId 
     * @returns {"online"|"offline"|"error"|"unknown"}
     */
    getMountStatus(mountId) {
        const provider = this.providers.get(mountId);
        if (!provider) return "offline";
        if (typeof provider.getStatus === "function") {
            return provider.getStatus();
        }
        return "online";
    }
}

const mountManager = new MountManager();

export default mountManager;
