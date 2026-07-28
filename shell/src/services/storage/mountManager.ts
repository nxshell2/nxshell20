/**
 * 挂载点管理器
 * 
 * 管理多个配置源（本地、WebDAV、SFTP等）
 */
import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";
import LocalFileStorage from "./localFileSystem";
import StorageProviderInterface from "./storageInterface";
import { ShellConfig } from "../sessionManage/shellConfig";
import path from "path";

const MOUNTS_FILE = "mounts.json";

// 挂载点类型
export const MOUNT_TYPES = {
    LOCAL: "local",
    WEBDAV: "webdav",
    SFTP: "sftp",
    S3: "s3"
};

// 默认本地挂载点
interface MountConfigData {
    id?: string;
    name?: string;
    type?: string;
    icon?: string;
    readonly?: boolean;
    order?: number;
    config?: ShellConfig;
    status?: string;
}

const DEFAULT_LOCAL_MOUNT: MountConfigData = {
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
    id: string = "";
    name: string = "";
    type: string = MOUNT_TYPES.LOCAL;
    icon: string = "folder";
    readonly: boolean = false;
    order: number = 0;
    config: ShellConfig | null = null;
    status: string = "online";

    constructor(data: MountConfigData = {}) {
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

    static fromJSON(data: MountConfigData) {
        return new MountConfig(data);
    }
}

/**
 * 挂载点管理器
 */
class MountManager extends EventEmitter {
    /** @type {MountConfig[]} */
    mounts: MountConfig[] = [];

    /** @type {Map<string, StorageProviderInterface>} */
    providers: Map<string, StorageProviderInterface> = new Map();

    /** @type {LocalFileStorage} */
    localStorage: LocalFileStorage = new LocalFileStorage();

    /** @type {boolean} */
    initialized: boolean = false;

    /** @type {boolean} */
    _pendingMigration: boolean = false;

    constructor() {
        super();
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
        let mountsData: MountConfigData[] | null = null;
        const mountsPath = path.join(this.localStorage.getAppDataDirty(), MOUNTS_FILE);
        try {
            const raw = await this.localStorage.readFile(mountsPath);
            if (raw) {
                mountsData = JSON.parse(raw) as MountConfigData[];
            }
        } catch (e: unknown) {
            console.log("Load mounts.json failed:", e);
        }

        // 一次性迁移：从旧加密格式读取
        if (!mountsData) {
            try {
                const legacyData = await this.localStorage.readLegacy("MOUNTS");
                if (legacyData && Array.isArray(legacyData) && legacyData.length > 0) {
                    console.log("[MountManager] Migrating legacy MOUNTS to mounts.json");
                    mountsData = legacyData as MountConfigData[];
                    // 标记需要保存
                    this._pendingMigration = true;
                }
            } catch (e: unknown) {
                console.log("Load legacy MOUNTS failed:", e);
            }
        }

        if (!mountsData || !Array.isArray(mountsData) || mountsData.length === 0) {
            // 初始化默认本地挂载点
            this.mounts = [MountConfig.fromJSON(DEFAULT_LOCAL_MOUNT)];
            await this.saveMounts();
        } else {
            this.mounts = mountsData.map(m => MountConfig.fromJSON(m));
            // 确保本地挂载点存在
            let needSave = false;
            if (!this.mounts.find(m => m.id === "local")) {
                this.mounts.unshift(MountConfig.fromJSON(DEFAULT_LOCAL_MOUNT));
                needSave = true;
            }
            // 从旧格式迁移后保存到 mounts.json
            if (this._pendingMigration) {
                needSave = true;
                this._pendingMigration = false;
            }
            if (needSave) {
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
        const mountsPath = path.join(this.localStorage.getAppDataDirty(), MOUNTS_FILE);
        await this.localStorage.writeFile(mountsPath, JSON.stringify(data, null, 2));
    }

    /**
     * 初始化单个 provider
     * @param {MountConfig} mount 
     */
    async _initProvider(mount: MountConfig) {
        try {
            const provider = await this._createProvider(mount);
            if (provider) {
                this.providers.set(mount.id, provider as StorageProviderInterface);
            }
        } catch (e: unknown) {
            console.error(`Init provider failed for mount ${mount.name}:`, e);
            // 不阻塞其他挂载点
        }
    }

    /**
     * 创建 provider 实例
     * @param {MountConfig} mount 
     * @returns {StorageProviderInterface}
     */
    async _createProvider(mount: MountConfig): Promise<StorageProviderInterface | null> {
        switch (mount.type) {
            case MOUNT_TYPES.LOCAL:
                return this.localStorage;

            case MOUNT_TYPES.WEBDAV: {
                // 动态导入 WebDAV provider
                const { default: WebDAVStorage } = await import("./providers/webdavStorage");
                if (!mount.config) throw new Error("WebDAV config is missing");
                return new WebDAVStorage(mount.config);
            }

            case MOUNT_TYPES.SFTP: {
                // 动态导入 SFTP provider
                const { default: SFTPStorage } = await import("./providers/sftpStorage");
                if (!mount.config) throw new Error("SFTP config is missing");
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
    getMount(mountId: string) {
        return this.mounts.find(m => m.id === mountId) || null;
    }

    /**
     * 获取挂载点的 provider
     * @param {string} mountId 
     * @returns {StorageProviderInterface|null}
     */
    getProvider(mountId: string): StorageProviderInterface | null {
        return this.providers.get(mountId) || null;
    }

    /**
     * 添加挂载点
     * @param {Object} mountData 
     * @returns {MountConfig}
     */
    async addMount(mountData: MountConfigData) {
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
    async updateMount(mountId: string, updates: Partial<MountConfigData>) {
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
    async removeMount(mountId: string) {
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
    async reorderMount(mountId: string, newOrder: number) {
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
    async testConnection(mount: MountConfig | MountConfigData) {
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
        } catch (e: unknown) {
            return { success: false, message: (e as Error).message || "连接失败" };
        }
    }

    /**
     * 获取挂载点状态
     * @param {string} mountId 
     * @returns {"online"|"offline"|"error"|"unknown"}
     */
    getMountStatus(mountId: string) {
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
