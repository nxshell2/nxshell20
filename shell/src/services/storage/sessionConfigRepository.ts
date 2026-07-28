/**
 * SessionConfigRepository
 *
 * 负责会话配置的文件系统读写：目录 = folder，文件 = session。
 * 与 SessionManager 配合使用，替代旧的 Storage.save("SESSIONS", tree) 单文件模式。
 */
import path from "path";
import { SESSION_CONFIG_TYPE } from "../sessionMgr";
import type { SessionConfig } from "../sessionMgr";
import StorageProviderInterface from "./storageInterface";

const FOLDER_META_FILE = ".folder.json";
const ROOT_META_FILE = ".root.json";
const SESSION_VERSION = 1;

interface DirEntry {
    name: string;
    isDir: boolean;
}

interface FolderMeta {
    version?: number;
    id?: string;
    name?: string;
    icon?: string;
    order?: number;
}

class SessionConfigRepository {
    basePath: string = "";
    provider: StorageProviderInterface | null = null;
    rootName: string = "";

    /**
     * 初始化 repository
     * @param provider StorageProviderInterface（支持 listDir/readFile/writeFile/createDir/deleteFile/move）
     * @param basePath sessions 根目录的绝对路径
     * @param rootName 挂载点名称（用于跳过同名重复目录）
     */
    async init(provider: StorageProviderInterface, basePath: string, rootName: string = "") {
        this.provider = provider;
        this.basePath = basePath;
        this.rootName = rootName;
        await this._ensureDir(basePath);
    }

    /**
     * 递归读取目录，构建 SessionConfig 树
     * @returns SessionConfig[] 顶层会话配置列表
     */
    async load(): Promise<SessionConfig[]> {
        if (!this.provider || !this.basePath) {
            throw new Error("Repository not initialized");
        }
        return await this._loadDir(this.basePath, null);
    }

    /**
     * 保存单个 session 配置到文件
     * @param sessionConfig SessionConfig 实例
     */
    async saveSession(sessionConfig: SessionConfig): Promise<void> {
        if (!this.provider || !this.basePath) {
            throw new Error("Repository not initialized");
        }
        const dirPath = this._getDirPath(sessionConfig);
        await this._ensureDir(dirPath);

        const fileName = await this._getUniqueSessionName(sessionConfig, dirPath);
        const filePath = path.join(dirPath, `${fileName}.json`);
        const content = JSON.stringify(this._sessionToJSON(sessionConfig), null, 2);
        await this.provider!.writeFile(filePath, content);
    }

    /**
     * 保存 folder 元数据
     * @param folderConfig SessionConfig 实例（type=folder）
     */
    async saveFolder(folderConfig: SessionConfig): Promise<void> {
        if (!this.provider || !this.basePath) {
            throw new Error("Repository not initialized");
        }
        const dirPath = this._getDirPath(folderConfig);
        await this._ensureDir(dirPath);

        const metaPath = path.join(dirPath, FOLDER_META_FILE);
        const meta = {
            version: SESSION_VERSION,
            id: folderConfig.uuid,
            name: folderConfig.name,
            icon: "folder",
            order: folderConfig.order || 0
        };
        await this.provider!.writeFile(metaPath, JSON.stringify(meta, null, 2));
    }

    /**
     * 删除 session 文件或 folder 目录
     * @param sessionConfig SessionConfig 实例
     */
    async delete(sessionConfig: SessionConfig): Promise<void> {
        if (!this.provider || !this.basePath) {
            throw new Error("Repository not initialized");
        }
        const targetPath = this._getFullPath(sessionConfig);
        await this.provider!.deleteFile(targetPath);
    }

    /**
     * 移动 session/folder 到目标目录
     * @param sessionConfig 要移动的 SessionConfig
     * @param targetFolder 目标父 folder 的 SessionConfig（null 表示移到根目录）
     */
    async move(sessionConfig: SessionConfig, targetFolder: SessionConfig | null): Promise<void> {
        if (!this.provider || !this.basePath) {
            throw new Error("Repository not initialized");
        }
        const fromPath = this._getFullPath(sessionConfig);
        const targetDir = targetFolder
            ? this._getDirPath(targetFolder)
            : this.basePath;
        await this._ensureDir(targetDir);

        const fileName = path.basename(fromPath);
        const toPath = path.join(targetDir, fileName);
        await this.provider!.move(fromPath, toPath);
    }

    /**
     * 从旧的单 JSON 树迁移到目录结构
     * @param legacyTree 旧的 session 配置数组
     */
    async migrateFromLegacy(legacyTree: any[]): Promise<void> {
        if (!this.provider || !this.basePath) {
            throw new Error("Repository not initialized");
        }
        await this._ensureDir(this.basePath);

        // 顶层若已有同名 mount root folder，把它的子节点提升到根下，避免嵌套重复
        const processed: any[] = [];
        for (const node of legacyTree) {
            if (this.rootName && node.type === SESSION_CONFIG_TYPE.FOLDER && node.name === this.rootName) {
                if (node.subSessions) {
                    processed.push(...node.subSessions);
                }
            } else {
                processed.push(node);
            }
        }

        for (const node of processed) {
            await this._migrateNode(node, this.basePath);
        }
    }

    // ========== 内部方法 ==========

    /**
     * 递归加载一个目录下的所有 session/folder
     */
    async _loadDir(dirPath: string, parent: SessionConfig | null): Promise<SessionConfig[]> {
        const entries: DirEntry[] = await this.provider!.listDir(dirPath);
        const results: SessionConfig[] = [];
        const isTopLevel = (dirPath === this.basePath);

        for (const entry of entries) {
            // 跳过元数据文件
            if (entry.name === FOLDER_META_FILE || entry.name === ROOT_META_FILE) {
                continue;
            }
            // 跳过非 JSON 文件或备份文件（非 session）
            if (!entry.isDir && (!entry.name.endsWith(".json") || entry.name.endsWith(".bak"))) {
                continue;
            }
            // 顶层目录下跳过与挂载点同名的文件夹（避免加载历史重复数据）
            if (isTopLevel && entry.isDir && this.rootName && entry.name === this.rootName) {
                continue;
            }

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDir) {
                // folder
                const folderConfig = await this._loadFolder(fullPath, entry.name);
                if (folderConfig) {
                    folderConfig._parent = parent;
                    results.push(folderConfig);
                }
            } else {
                // session file
                const sessionConfig = await this._loadSession(fullPath, entry.name);
                if (sessionConfig) {
                    sessionConfig._parent = parent;
                    results.push(sessionConfig);
                }
            }
        }

        // 按 order 排序
        results.sort((a, b) => (a.order || 0) - (b.order || 0));
        return results;
    }

    /**
     * 加载 folder 目录
     */
    async _loadFolder(dirPath: string, dirName: string): Promise<SessionConfig> {
        // 读取 .folder.json 元数据
        const metaPath = path.join(dirPath, FOLDER_META_FILE);
        let meta: FolderMeta | null = null;
        try {
            const raw = await this.provider!.readFile(metaPath);
            if (raw) {
                meta = JSON.parse(raw) as FolderMeta;
            }
        } catch (e) {
            // 无元数据文件，使用目录名
        }

        const { SessionConfig } = require("../sessionMgr");
        const folder = new SessionConfig(
            meta?.name || dirName,
            SESSION_CONFIG_TYPE.FOLDER,
            null,
            "",
            meta?.id || ""
        );
        folder.order = meta?.order || 0;

        // 递归加载子节点
        const children = await this._loadDir(dirPath, folder);
        for (const child of children) {
            folder.addSessionConfig(child);
        }

        return folder;
    }

    /**
     * 加载单个 session 文件
     */
    async _loadSession(filePath: string, fileName: string): Promise<SessionConfig | null> {
        const raw = await this.provider!.readFile(filePath);
        if (!raw) {
            return null;
        }

        let data: Record<string, unknown>;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.warn(`Failed to parse session file: ${fileName}`, e);
            return null;
        }

        const { SessionConfig } = require("../sessionMgr");
        const name = (data.name as string) || fileName.replace(/\.json$/, "");
        // 使用分层转换：layered JSON → flat config（兼容旧 UI）
        const config = SessionConfig._layeredToFlat(data as any);

        const session = new SessionConfig(
            name,
            SESSION_CONFIG_TYPE.NODE,
            config,
            (data.description as string) || "",
            (data.id as string) || (data.uuid as string) || ""
        );
        session.order = (data.order as number) || 0;

        return session;
    }

    /**
     * 递归迁移旧节点
     */
    async _migrateNode(node: any, parentDir: string): Promise<void> {
        if (node.type === SESSION_CONFIG_TYPE.FOLDER) {
            const dirName = this._sanitizeFileName(node.name);
            const dirPath = path.join(parentDir, dirName);
            await this._ensureDir(dirPath);

            // 写 .folder.json
            const meta = {
                version: SESSION_VERSION,
                id: node.uuid,
                name: node.name,
                icon: "folder",
                order: node.order || 0
            };
            await this.provider!.writeFile(
                path.join(dirPath, FOLDER_META_FILE),
                JSON.stringify(meta, null, 2)
            );

            // 递归迁移子节点
            if (node.subSessions) {
                for (const child of node.subSessions) {
                    await this._migrateNode(child, dirPath);
                }
            }
        } else {
            // session node — 使用分层 schema 写入
            const { SessionConfig } = require("../sessionMgr");
            const fileName = this._sanitizeFileName(node.name);
            const filePath = path.join(parentDir, `${fileName}.json`);
            // 构建临时 SessionConfig 以调用 toPersistentJSON
            const tmp = new SessionConfig(
                node.name,
                SESSION_CONFIG_TYPE.NODE,
                node.config,
                node.description || "",
                node.uuid || ""
            );
            tmp.order = node.order || 0;
            const content = JSON.stringify(tmp.toPersistentJSON(), null, 2);
            await this.provider!.writeFile(filePath, content);
        }
    }

    /**
     * SessionConfig 转 JSON（写入文件）
     */
    _sessionToJSON(sessionConfig: SessionConfig): Record<string, unknown> {
        if (typeof sessionConfig.toPersistentJSON === "function") {
            return sessionConfig.toPersistentJSON();
        }
        // fallback for plain objects
        return {
            version: SESSION_VERSION,
            id: sessionConfig.uuid,
            name: sessionConfig.name,
            type: "node",
            protocol: sessionConfig.config?.sessType || sessionConfig.config?.protocal || "",
            description: sessionConfig.description || "",
            order: sessionConfig.order || 0,
            config: sessionConfig.config
        } as Record<string, unknown>;
    }

    /**
     * 获取 session/folder 在文件系统中的完整路径
     */
    _getFullPath(sessionConfig: SessionConfig): string {
        const dirPath = this._getDirPath(sessionConfig);
        if (sessionConfig.type === SESSION_CONFIG_TYPE.FOLDER) {
            return dirPath;
        }
        const fileName = this._sanitizeFileName(sessionConfig.name);
        return path.join(dirPath, `${fileName}.json`);
    }

    /**
     * 获取 session/folder 所在的目录路径
     * 通过递归向上遍历 _parent 构建路径
     */
    _getDirPath(sessionConfig: SessionConfig): string {
        const segments: string[] = [];
        let current = sessionConfig;

        while (current && current._parent && current._parent.type === SESSION_CONFIG_TYPE.FOLDER) {
            // 遇到 mount root 时停止，不把挂载点名称加入路径
            if (current._parent._isMount) {
                break;
            }
            segments.unshift(this._sanitizeFileName(current._parent.name));
            current = current._parent;
        }

        // 如果 sessionConfig 自身是 folder，加上自己的目录名
        if (sessionConfig.type === SESSION_CONFIG_TYPE.FOLDER) {
            segments.unshift(this._sanitizeFileName(sessionConfig.name));
        }

        return path.join(this.basePath, ...segments);
    }

    /**
     * 确保目录存在
     */
    async _ensureDir(dirPath: string): Promise<void> {
        await this.provider!.createDir(dirPath);
    }

    /**
     * 生成目录下唯一的 session 文件名
     * 若目标文件已存在且不属于当前 session（id 不同），则追加 -<n> 后缀
     */
    async _getUniqueSessionName(sessionConfig: SessionConfig, dirPath: string): Promise<string> {
        const baseName = this._sanitizeFileName(sessionConfig.name);
        let fileName = baseName;
        let filePath = path.join(dirPath, `${fileName}.json`);
        let existing: string | null = null;
        try {
            existing = await this.provider!.readFile(filePath);
        } catch (e) {
            existing = null;
        }
        if (!existing) {
            return fileName;
        }

        try {
            const data = JSON.parse(existing) as Record<string, unknown>;
            if ((data.id as string) === sessionConfig.uuid) {
                return fileName;
            }
        } catch (e) {
            // malformed file, treat as conflict
        }

        let suffix = 1;
        while (existing) {
            fileName = `${baseName}-${suffix++}`;
            filePath = path.join(dirPath, `${fileName}.json`);
            try {
                existing = await this.provider!.readFile(filePath);
            } catch (e) {
                existing = null;
            }
        }
        return fileName;
    }

    /**
     * 清理文件名中的非法字符
     */
    _sanitizeFileName(name: string): string {
        if (!name) return "unnamed";
        return name.replace(/[/:*?"<>|]/g, "_").trim();
    }
}

export default SessionConfigRepository;
