/**
 * 会话管理器
 *
 * 包括：会话配置管理和会话实例管理
 */
import { EventEmitter } from "events";
import { insert } from "../../common/utils";
import { IdGenerator } from "../../common/utils/idGenerator";
import WaitObject from "../../common/utils/waitObject";
import { getSessionFactory, SESSION_TYPES } from "./session";
import path from "path";

import { getNodeSessionInstanceByUUID } from "./nxsys/nodes";

import Storage from "./storage";
import mountManager from "./storage/mountManager";
import SessionConfigRepository from "./storage/sessionConfigRepository";
import { ShellConfig } from "./sessionManage/shellConfig";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";

import * as EventBus from "./eventbus";

import SessionRecent from "./sessionRecent";
import type { MountConfig } from "./storage/mountManager";

export const SESSION_CONFIG_TYPE = {
    FOLDER: "folder",
    NODE: "node"
}

const sessConfigIdGenerator = new IdGenerator();
const sessInstanceIdGenerator = new IdGenerator();

/**
 * 会话配置
 */
export class SessionConfig extends EventEmitter {
    /**
     * 会话配置ID
     * 运行时属性，不做持久化处理
     * 根据ID和View层做关联处理
     */
    _isMount: boolean = false;
    _mountConfig: MountConfig | null = null;
    _id: number = 0

    /**
     * 父节点
     * @type {SessionConfig}
     */
    _parent: SessionConfig | null = null

    /** 会话持久化UUID */
    uuid: string = ""
    /** 所属挂载点ID */
    mountId: string = "local"
    /**
     * 会话名称
     * @property {SessionConfig}
     */
    name: string = ""
    config: ShellConfig = {} as ShellConfig
    description: string = ""
    type: string = "node"
    subSessions: SessionConfig[] = []
    /** 排序权重，用于文件系统存储时的顺序 */
    order: number = 0

    /** 协议类型快捷访问 */
    get protocol(): string {
        return this.config?.sessType || this.config?.protocal || ""
    }

    /**
     * @constructor {SessionConfig}
     * @param {String}  name 会话名称
     * @param {String}  [type] 会话类型，Folder或者Node，默认为Node
     * @param {Object}  [configParam] 会话配置参数
     * @param {String}  [configParam.sessType] 会话的类型
     * @param {String}  [description] 会话描述
     * @param {String}  [uuid] 会话UUID
     * @param {String}  [mountId] 所属挂载点ID
     */
    constructor(name: string, type: string = SESSION_CONFIG_TYPE.NODE, configParam: ShellConfig | null = null, description: string = "", uuid: string = "", mountId: string = "local") {
        super();

        this._id = sessConfigIdGenerator.getNext();
        this.type = type;
        this.name = name;
        this.config = configParam || {} as ShellConfig;
        this.description = description;
        this.uuid = uuid || uuidv4();
        this.mountId = mountId;
    }

    /**
     * 添加会话配置到子会话列表中
     *
     * @param {SessionConfig} sessionNode 会话节点
     * @param {Number} [index] 会话节点插入的位置：小于等于0，插入到子会话头部，如果没有指定或者大于子会话的个数，则插入到子会话的尾部
     */
    addSessionConfig(sessionNode: SessionConfig, index?: number) {
        if (this.type === SESSION_CONFIG_TYPE.NODE) {
            throw new Error("session node can not add sub-config");
        }
        if (!(sessionNode instanceof SessionConfig)) {
            throw new Error("SessionNode must be a instance of SessionConfig");
        }
        this.subSessions = insert(this.subSessions, sessionNode, index);
        sessionNode._parent = this;

        // this.emit("add-session", sessionNode);
        EventBus.publish("session-added", sessionNode);
    }

    update(name: string, configParam: ShellConfig | null, description?: string) {

        this.name = name;
        if (configParam) {
            this.config = configParam;
        }
        if (typeof description === "string") {
            this.description = description
        }

        getNodeSessionInstanceByUUID(this.uuid).then((instance) => {
            instance.updateConfig(_.cloneDeep({
                name: this.name,
                uuid: this.uuid,
                ...this.config
            }));
        }).catch((_err) => {

        });

        // this.emit("update", this);
        EventBus.publish("session-update", this);
    }

    /**
     * 根据ID查找配置项
     * @param {Number} id 配置项ID
     */
    findSubSessionConfig(id: number) {
        const ret: { sessionConfig: SessionConfig | null; index: number } = {
            sessionConfig: null,
            index: -1
        }

        for (let i = 0; i < this.subSessions.length; i++) {
            /** @type {SessionConfig} */
            let sessionConfig = this.subSessions[i];
            if (sessionConfig._id == id) {
                ret.sessionConfig = sessionConfig;
                ret.index = i;
                break;
            }
        }

        return ret;
    }

    /**
     * 移除一个会话配置
     *
     * 移除会话配置时，如果该会话配置下面存在子会话配置，则会被一同移除掉
     *
     * @param {SessionConfig|Number} session 会话对象或者会话在子节点列表中的位置
     * @param {Boolean} [move] 是否为移动节点操作，默认是删除操作
     */
    removeSubSessionConfig(session: SessionConfig | number, move: boolean = false) {
        let removeSession: SessionConfig[];
        if (typeof session === "number") {
            removeSession = this.subSessions.splice(session, 1);
        } else {
            // 无效的配置节点
            if (!(session instanceof SessionConfig)) {
                return;
            }
            let idx = this.subSessions.findIndex((val) => {
                return val._id == session._id;
            });

            removeSession = this.subSessions.splice(idx, 1);
        }
        if (move) {
            return
        }
        // this.emit("remove", removeSession[0]);
        // 递归删除
        /** @type {SessionConfig} */
        const curRemoveNode = removeSession[0];
        for (let i = curRemoveNode.subSessions.length - 1; i >= 0; i--) {
            let sessItem = curRemoveNode.subSessions[i];
            curRemoveNode.removeSubSessionConfig(sessItem);
        }
        // curRemoveNode.emit("remove", curRemoveNode);
        EventBus.publish("session-removed", curRemoveNode);
    }

    /**
     * 复制该会话配置对象，包括子节点
     */
    duplicate() {
        /**
         * 复制节点
         * @param {SessionConfig} parent 父节点
         */
        const duplicate = (parent: SessionConfig) => {
            let config = new SessionConfig(
                parent.name,
                parent.type,
                parent.config ? _.cloneDeep(parent.config) as ShellConfig : null,
                parent.description
                /* TODO: add uuid */
            )

            parent.subSessions.forEach((subSession: SessionConfig) => {
                let newSubSession = duplicate(subSession);
                config.addSessionConfig(newSubSession);
            })

            return config;
        }

        return duplicate(this);
    }

    /**
     * 转换节点为JSON对象（PlainObject）
     *
     * @param {Boolean} [recursion] 是否递归，如果递归则遍历所有子会话节点
     * @param {Boolean} [id] 是否包含Id字段
     */
    toJSONObject(recursion: boolean = false, id: boolean = true): Record<string, unknown> {
        let subSessions;

        if (this.type !== SESSION_CONFIG_TYPE.NODE && recursion) {
            subSessions = this.subSessions.map(sessionObj => sessionObj.toJSONObject(recursion, id));
        }

        const sessObj: Record<string, unknown> = {
            name: this.name,
            config: this.config,
            description: this.description,
            type: this.type,
            uuid: this.uuid,
            mountId: this.mountId
        };

        if (subSessions) {
            sessObj.subSessions = subSessions;
        }
        if (id) {
            sessObj._id = this._id;
        }
        return sessObj;
    }

    /**
     * 输出持久化 JSON（用于文件系统存储）
     * 不包含运行时字段（_id, _parent, _isMount, _mountConfig）
     * 使用分层 schema：connection / authentication / sshOptions / serialOptions / terminal
     */
    toPersistentJSON(): Record<string, unknown> {
        const layered = SessionConfig._flatToLayered(this.config);
        return {
            version: 1,
            id: this.uuid,
            name: this.name,
            type: this.type,
            protocol: this.protocol,
            description: this.description,
            order: this.order,
            system: this.config?.system || "",
            ...layered
        };
    }

    /**
     * 将扁平 config 转为分层 schema
     */
    static _flatToLayered(config: ShellConfig | null): Record<string, unknown> {
        if (!config) return {};
        let protocol = (config.protocal || config.sessType || "").toLowerCase();
        if (protocol === "shell" && (config.hostAddress || config.hostPort)) {
            protocol = (config.protocal || "ssh").toLowerCase();
        }
        if (!protocol) {
            protocol = "ssh";
        }
        const result: Record<string, unknown> = {};

        // Terminal fields
        const terminalFields = [
            "fontFamily", "xterm", "fontSize", "fontWeight", "charset",
            "lineHeight", "letterSpacing", "cursorBlink", "cursorStyle", "xtermTheme"
        ];
        const terminal: Record<string, unknown> = {};
        for (const f of terminalFields) {
            if (config[f] !== undefined) {
                terminal[f] = config[f];
            }
        }
        if (Object.keys(terminal).length > 0) {
            result.terminal = terminal;
        }

        if (protocol === "ssh") {
            // connection
            result.connection = {
                host: config.hostAddress || "",
                port: config.hostPort || 22,
                proxy: {
                    type: config.proxy || "none",
                    host: config.proxyHost || "",
                    port: config.proxyPort || 1080
                }
            };
            // authentication
            result.authentication = {
                type: config.authType || (config.cert ? "cert" : "password"),
                username: config.username || "",
                password: config.password || "",
                cert: config.cert || "",
                passphrase: config.passphrase || ""
            };
            // sshOptions
            result.sshOptions = {
                keepAliveInterval: config.keepAliveInterval ?? 60,
                keepAliveCountMax: config.keepAliveCountMax ?? 3,
                readyTimeout: config.readyTimeout ?? 20000,
                forwardX11: config.forward === "x11",
                sftpDir: config.sftpDir || config.sftpDirt || "/",
                portForwards: config.forwardIn || []
            };
        } else if (protocol === "telnet") {
            result.connection = {
                host: config.hostAddress || "",
                port: config.hostTelnetPort || 23
            };
        } else if (protocol === "ftp") {
            result.connection = {
                host: config.hostAddress || "",
                port: config.hostFtpPort || 21,
                secure: config.secure || "false"
            };
            result.authentication = {
                username: config.username || "",
                password: config.password || ""
            };
        } else if (protocol === "serialport") {
            result.serialOptions = {
                baudRate: config.baudRate ?? 115200,
                dataBits: config.dataBits ?? 8,
                stopBits: config.stopBits ?? 1,
                parity: config.parity || "none",
                flowControl: config.flowControl || "none",
                port: config.port || "COM1"
            };
        } else if (protocol === "vnc") {
            result.connection = {
                host: config.hostAddress || "",
                port: config.hostVncPort || 5800
            };
            result.authentication = {
                username: config.username || "",
                password: config.password || ""
            };
        } else if (protocol === "localshell") {
            if (config.shellType) {
                result.shellType = config.shellType;
            }
        }

        // Copy any remaining unknown fields
        const knownFields = new Set([
            "sessType", "protocal", "hostName", "system",
            "hostAddress", "hostPort", "hostTelnetPort", "hostFtpPort", "hostVncPort",
            "proxy", "proxyHost", "proxyPort", "authType", "username", "password",
            "cert", "passphrase", "forward", "sftpDir", "sftpDirt", "keepAliveInterval",
            "keepAliveCountMax", "readyTimeout", "forwardIn",
            "secure", "baudRate", "dataBits", "stopBits", "parity", "flowControl", "port",
            "shellType",
            ...terminalFields
        ]);
        const extra: any = {};
        for (const key of Object.keys(config)) {
            if (!knownFields.has(key)) {
                extra[key] = config[key];
            }
        }
        if (Object.keys(extra).length > 0) {
            result.extra = extra;
        }

        return result;
    }

    /**
     * 将分层 schema 转回扁平 config（供 UI 兼容使用）
     */
    static _layeredToFlat(data: any): ShellConfig {
        if (!data) return {} as ShellConfig;
        const rawConfig: ShellConfig = (data.config as ShellConfig) || {} as ShellConfig;
        const protocol = (data.protocol as string) || rawConfig.sessType || rawConfig.protocal || "";
        const config: Record<string, unknown> = {
            sessType: protocol,
            protocal: protocol,
            hostName: data.name || "",
            system: data.system || data.config?.system || ""
        };

        // Terminal
        if (data.terminal) {
            Object.assign(config, data.terminal);
        }

        if (data.connection) {
            config.hostAddress = data.connection.host || "";
            if (protocol === "ssh") {
                config.hostPort = data.connection.port || 22;
                if (data.connection.proxy) {
                    config.proxy = data.connection.proxy.type || "none";
                    config.proxyHost = data.connection.proxy.host || "";
                    config.proxyPort = data.connection.proxy.port || 1080;
                }
            } else if (protocol === "telnet") {
                config.hostTelnetPort = data.connection.port || 23;
            } else if (protocol === "ftp") {
                config.hostFtpPort = data.connection.port || 21;
                config.secure = data.connection.secure || "false";
            } else if (protocol === "vnc") {
                config.hostVncPort = data.connection.port || 5800;
            }
        }

        if (data.authentication) {
            config.username = data.authentication.username || "";
            config.password = data.authentication.password || "";
            if (protocol === "ssh") {
                config.authType = data.authentication.type || "password";
                config.cert = data.authentication.cert || "";
                config.passphrase = data.authentication.passphrase || "";
            }
        }

        if (data.sshOptions) {
            config.keepAliveInterval = data.sshOptions.keepAliveInterval ?? 60;
            config.keepAliveCountMax = data.sshOptions.keepAliveCountMax ?? 3;
            config.readyTimeout = data.sshOptions.readyTimeout ?? 20000;
            config.forward = data.sshOptions.forwardX11 ? "x11" : "none";
            config.sftpDir = data.sshOptions.sftpDir || "/";
            // Backward compatibility: also expose the legacy sftpDirt key
            config.sftpDirt = data.sshOptions.sftpDir || "/";
            config.forwardIn = data.sshOptions.portForwards || [];
        }

        if (data.serialOptions) {
            config.baudRate = data.serialOptions.baudRate ?? 115200;
            config.dataBits = data.serialOptions.dataBits ?? 8;
            config.stopBits = data.serialOptions.stopBits ?? 1;
            config.parity = data.serialOptions.parity || "none";
            config.flowControl = data.serialOptions.flowControl || "none";
            config.port = data.serialOptions.port || "COM1";
        }

        if (data.shellType) {
            config.shellType = data.shellType;
        }

        // Extra unknown fields
        if (data.extra) {
            Object.assign(config, data.extra);
        }

        // Fallback: if data has a flat config property (old format), merge it
        if (data.config && typeof data.config === "object") {
            Object.assign(config, data.config);
        }

        return config;
    }

    dispose() {
        this.removeAllListeners();
    }
}

class SessionManager extends EventEmitter {
    sessionConfigs: any[] = [];
    sessionConfigsMapper: any = {};
    sessionConfigsUUIDMapper: any = {};
    /**
     * @type {SessionConfig} 会话配置树的根节点，根节点是个虚拟节点，主要是解决配置树的管理问题
     * @deprecated 使用 mountRoots 代替
     */
    sessionConfigsRoot: any = new SessionConfig("root", SESSION_CONFIG_TYPE.FOLDER)

    /**
     * 挂载点根节点映射
     * @type {Map<string, SessionConfig>}
     */
    mountRoots: Map<string, any> = new Map();

    /**
     * @type {SessionInterface[]}
     */
    sessionInstances: any[] = [];
    sessionInstancesMapper: any = {};

    /** @type {{[propName: number]: WaitObject}} */
    sessionCreateJobs: any = {};

    /** @type {{[propName: number]: Set<number>}} */
    sessionConfigAssociated = Object.create(null);
    /** @type {{[propName: number]: number}} */
    sessionInstAssociated = Object.create(null);

    /**
     * @type {SessionInterface} 登录会话实例
     */
    loginSessionInstance: any = null;

    /**
     * @type {SessionRecent} 会话历史记录
     */
    sessionRecent: any = null;

    /**
     * 挂载点管理器引用
     */
    mountManager = mountManager;

    /**
     * 会话配置仓库（用于本地目录结构存储）
     */
    sessionConfigRepo: SessionConfigRepository = new SessionConfigRepository();
    sessionsBasePath: string = "";

    constructor() {
        super();

        this.sessionRecent = new SessionRecent();
        // TODO: add code here
        EventBus.subscript("session-update", (sessionConfig: any) => {
            this.handleSessionConfigUpdate(sessionConfig);
        });

        EventBus.subscript("session-removed", (sessionConfig: any) => {
            this.handleSessionConfigRemove(sessionConfig);
        });

        EventBus.subscript("instance-close", (inst: any) => {
            this.handleInstanceDestroy(inst.id);
        });

        // 监听挂载点变化
        mountManager.on("mount-added", (mount: MountConfig) => {
            this._initMountRoot(mount);
            this.loadMountSessions(mount.id);
        });

        mountManager.on("mount-removed", (mount: MountConfig) => {
            this._removeMountRoot(mount.id);
        });
    }

    /**
     * 初始化挂载点根节点
     * @param {Object} mount 
     */
    _initMountRoot(mount: MountConfig) {
        const root = new SessionConfig(mount.name, SESSION_CONFIG_TYPE.FOLDER, null, "", "", mount.id);
        root._isMount = true;
        root._mountConfig = mount;
        this.mountRoots.set(mount.id, root);
        return root;
    }

    /**
     * 移除挂载点根节点
     * @param {string} mountId 
     */
    _removeMountRoot(mountId: string) {
        const root = this.mountRoots.get(mountId);
        if (root) {
            // 清理该挂载点下所有会话的映射
            const clearMapper = (node: any) => {
                delete this.sessionConfigsMapper[node._id];
                delete this.sessionConfigsUUIDMapper[node.uuid];
                node.subSessions.forEach(clearMapper);
            };
            clearMapper(root);
            this.mountRoots.delete(mountId);
        }
    }

    /**
     * 处理会话配置移除事件
     * @param {SessionConfig} sessCfgObj 会话配置对象
     */
    handleSessionConfigRemove(sessCfgObj: any) {
        // this.emit("session-remove", sessCfgObj);

        /* 清除历史记录 */
        this.sessionRecent.removeRecent(sessCfgObj.uuid);

        const sessionInstances = this.matchSessionInstanceByConfig(sessCfgObj) || [];
        sessionInstances.forEach((inst) => {
            inst.close();
        });

        /* 销毁自己 */
        sessCfgObj.dispose();
        this.saveSessionConfigs()
    }

    handleSessionConfigUpdate(sessCfgObj: any) {
        // this.emit("session-update", sessCfgObj);
        this.saveSessionConfigsForMount(sessCfgObj.mountId);
    }

    /**
     * 加载所有挂载点的会话配置
     */
    async loadAllMounts() {
        // 初始化挂载点管理器
        await mountManager.initialize();

        const mounts = mountManager.getMounts();
        
        // 先初始化所有根节点
        for (const mount of mounts) {
            this._initMountRoot(mount);
        }

        // 兼容旧代码：将本地挂载点作为默认 sessionConfigsRoot
        const localRoot = this.mountRoots.get("local");
        if (localRoot) {
            this.sessionConfigsRoot = localRoot;
        }

        // 优先加载本地会话（同步等待）
        try {
            await this.loadMountSessions("local");
        } catch (e) {
            console.error("Failed to load local sessions:", e);
        }

        // 远程挂载点异步加载，不阻塞启动
        const remoteMounts = mounts.filter(m => m.id !== "local");
        if (remoteMounts.length > 0) {
            this._loadRemoteMountsAsync(remoteMounts);
        }
    }

    /**
     * 获取挂载点的 sessions 根路径
     * 本地: <appData>/nxshell-config/sessions
     * 远程: <basePath>/nxshell-config/sessions
     */
    _getMountSessionsPath(mountId: string): string {
        const mount = mountManager.getMount(mountId);
        if (!mount) return "";

        if (mountId === "local") {
            const provider = mountManager.getProvider(mountId);
            if (provider && provider.getAppDataDirty) {
                return path.join(provider.getAppDataDirty(), "sessions");
            }
            return "";
        }

        // 远程挂载: basePath/nxshell-config/sessions
        const basePath = mount.config?.basePath || "/nxshell";
        return `${basePath}/nxshell-config/sessions`;
    }

    /**
     * 为挂载点创建 SessionConfigRepository
     */
    async _getMountRepo(mountId: string): Promise<SessionConfigRepository | null> {
        const provider = mountManager.getProvider(mountId);
        if (!provider) return null;

        const sessionsPath = this._getMountSessionsPath(mountId);
        if (!sessionsPath) return null;

        const mount = mountManager.getMount(mountId);
        const repo = new SessionConfigRepository();
        await repo.init(provider, sessionsPath, mount?.name || "");
        return repo;
    }

    /**
     * 异步加载远程挂载点（不阻塞主流程）
     * @param {Array} mounts 
     */
    async _loadRemoteMountsAsync(mounts: any[]) {
        for (const mount of mounts) {
            try {
                await this.loadMountSessions(mount.id);
                // 加载成功，标记为在线
                mount.status = "online";
                // 通知 UI 刷新
                this.emit("mount-sessions-loaded", mount.id);
            } catch (e: unknown) {
                console.warn(`Failed to load remote mount ${mount.name}:`, (e as Error).message);
                // 标记挂载点状态为离线
                mount.status = "offline";
                // 也要通知 UI 刷新以显示离线状态
                this.emit("mount-sessions-loaded", mount.id);
            }
        }
    }

    /**
     * 加载指定挂载点的会话配置
     * @param {string} mountId 
     * @param {number} timeout 超时时间（毫秒），默认 10 秒
     */
    async loadMountSessions(mountId: string, timeout: number = 10000) {
        const provider = mountManager.getProvider(mountId);
        if (!provider) {
            console.warn(`No provider for mount: ${mountId}`);
            throw new Error(`No provider for mount: ${mountId}`);
        }

        const root = this.mountRoots.get(mountId);
        if (!root) {
            console.warn(`No root for mount: ${mountId}`);
            throw new Error(`No root for mount: ${mountId}`);
        }

        // 尝试用新的目录结构加载
        let sessConfigs: any[] = [];

        try {
            if (mountId !== "local") {
                const timeoutPromise = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error("Load timeout")), timeout)
                );
                const repo = await Promise.race([
                    this._getMountRepo(mountId),
                    timeoutPromise
                ]);
                if (repo) {
                    sessConfigs = await repo.load();
                }
            } else {
                const repo = await this._getMountRepo(mountId);
                if (repo) {
                    sessConfigs = await repo.load();
                }
            }
        } catch (e: unknown) {
            console.warn(`[SessionManager] Load failed for ${mountId}:`, (e as Error).message);
            if (mountId !== "local") {
                const mount = mountManager.getMount(mountId);
                if (mount) {
                    mount.status = "offline";
                }
                throw e;
            }
        }

        // 新格式加载为空时，尝试从旧格式迁移
        if (sessConfigs.length === 0) {
            try {
                let legacyData: unknown = null;
                if (mountId === "local" && typeof provider.readLegacy === 'function') {
                    legacyData = await provider.readLegacy("SESSIONS");
                } else {
                    legacyData = await provider.read("SESSIONS");
                }
                if (legacyData && Array.isArray(legacyData) && legacyData.length > 0) {
                    console.log(`[SessionManager] Migrating ${legacyData.length} sessions from legacy format for mount ${mountId}`);
                    const repo = await this._getMountRepo(mountId);
                    if (repo) {
                        await repo.migrateFromLegacy(legacyData as any[]);
                        sessConfigs = await repo.load();
                        console.log(`[SessionManager] Migration complete for mount ${mountId}, loaded ${sessConfigs.length} sessions`);
                        // Rename/delete old SESSIONS file after successful migration
                        try {
                            if (typeof provider.getAppDataDirty === 'function') {
                                const customDir = ((provider as any).nxsoftconfig?.xterm?.nxconfig || (provider as any).nxsoftconfig?.nxconfig) as string | undefined;
                                const legacyDir = customDir || path.dirname(provider.getAppDataDirty());
                                const oldPath = path.join(legacyDir, "__PT_LOCAL_STORAGE__SESSIONS");
                                const bakPath = path.join(legacyDir, "__PT_LOCAL_STORAGE__SESSIONS.bak");
                                try {
                                    await provider.move(oldPath, bakPath);
                                    console.log(`[SessionManager] Renamed legacy SESSIONS to .bak for mount ${mountId}`);
                                } catch (e: unknown) {
                                    // ignore if not present in legacyDir
                                }
                            } else if (typeof provider.delete === 'function') {
                                // Remote storage: delete old file
                                await provider.delete("SESSIONS");
                                console.log(`[SessionManager] Deleted legacy SESSIONS for remote mount ${mountId}`);
                            }
                        } catch (e: unknown) {
                            console.warn(`[SessionManager] Failed to clean up legacy SESSIONS file:`, (e as Error).message);
                        }
                    }
                }
            } catch (e: unknown) {
                console.warn(`[SessionManager] Legacy migration check failed for ${mountId}:`, (e as Error).message);
            }
        }

        // 清空现有子会话
        root.subSessions = [];

        const registerConfigs = (configs: any[], parentMountId: string) => {
            for (let sessConfig of configs) {
                sessConfig.mountId = parentMountId;
                this.sessionConfigsMapper[sessConfig._id] = sessConfig;
                this.sessionConfigsUUIDMapper[sessConfig.uuid] = sessConfig;
                if (sessConfig.subSessions && sessConfig.subSessions.length > 0) {
                    registerConfigs(sessConfig.subSessions, parentMountId);
                }
            }
        };

        registerConfigs(sessConfigs, mountId);
        sessConfigs.forEach(configNode => {
            root.addSessionConfig(configNode);
        });
    }

    /**
     * 兼容旧代码的加载方法
     * @deprecated 使用 loadAllMounts 代替
     */
    async loadSessionConfigs() {
        await this.loadAllMounts();
    }

    async setConfigPath(file_path: string) {
        await Storage.setConfigPath(file_path)
    }

    /**
     * 保存Session的配置（所有挂载点）
     */
    async saveSessionConfigs() {
        // 保存所有挂载点
        for (const [mountId] of this.mountRoots) {
            await this.saveSessionConfigsForMount(mountId);
        }
    }

    /**
     * 保存指定挂载点的会话配置
     * @param {string} mountId 
     */
    async saveSessionConfigsForMount(mountId: string): Promise<void> {
        console.log(`[SessionManager] saveSessionConfigsForMount: ${mountId}`);
        
        const mount = mountManager.getMount(mountId);
        if (!mount) {
            console.warn(`[SessionManager] Mount not found: ${mountId}`);
            return;
        }

        // 只读挂载点不保存
        if (mount.readonly) {
            console.warn(`Mount ${mountId} is readonly, skip save`);
            return;
        }

        const provider = mountManager.getProvider(mountId);
        if (!provider) {
            console.warn(`[SessionManager] Provider not found for mount: ${mountId}`);
            // 尝试初始化 provider
            await mountManager._initProvider(mount);
            const retryProvider = mountManager.getProvider(mountId);
            if (!retryProvider) {
                console.error(`[SessionManager] Failed to init provider for mount: ${mountId}`);
                return;
            }
            return this.saveSessionConfigsForMount(mountId);
        }

        const root = this.mountRoots.get(mountId);
        if (!root) {
            console.warn(`[SessionManager] Mount root not found: ${mountId}`);
            return;
        }

        const repo = await this._getMountRepo(mountId);
        if (!repo) {
            console.error(`[SessionManager] Failed to create repo for mount: ${mountId}`);
            return;
        }

        // 递归保存所有 session 和 folder
        const saveNode = async (node: any) => {
            if (node.type === SESSION_CONFIG_TYPE.FOLDER) {
                await repo.saveFolder(node);
                for (const child of node.subSessions) {
                    await saveNode(child);
                }
            } else {
                await repo.saveSession(node);
            }
        };
        for (const sessObj of root.subSessions) {
            await saveNode(sessObj);
        }
        console.log(`[SessionManager] Save successful for mount ${mountId}`);
    }

    /**
     * 添加配置到父节点
     *
     * @param {SessionConfig|Object} parent 父节点，当父节点无效时，添加到根节点下，需要注意的是Vue会把一些对象赋值直接改变成了响应式数据
     *                                      这就导致了传过来的节点已经不是原来的SessionConfig对象了
     * @param {SessionConfig} sessCfg 新增配置节点
     * @param {string} [mountId] 目标挂载点ID，默认使用父节点的挂载点或 "local"
     */
    async addSessionConfig(parent: any, sessCfg: any, mountId: any = null) {
        let targetMountId = mountId;

        if (!parent) {
            // 没有父节点时，使用指定的挂载点或默认本地
            targetMountId = targetMountId || sessCfg.mountId || "local";
            const root = this.mountRoots.get(targetMountId) || this.sessionConfigsRoot;
            root.addSessionConfig(sessCfg);
        } else {
            // 根据id获取SessionConfig对象
            // 先从 sessionConfigsMapper 查找，如果找不到，检查是否是挂载点根节点
            let parentConfig = this.sessionConfigsMapper[parent._id];
            
            if (!parentConfig) {
                // 可能是挂载点根节点
                for (const [mId, root] of this.mountRoots) {
                    if (root._id === parent._id) {
                        parentConfig = root;
                        targetMountId = mId;
                        break;
                    }
                }
            }
            
            if (!parentConfig) {
                // 仍然找不到，使用默认
                console.warn("Parent config not found, using default root");
                parentConfig = this.sessionConfigsRoot;
                targetMountId = "local";
            }
            
            parentConfig.addSessionConfig(sessCfg);
            // 继承父节点的挂载点
            targetMountId = targetMountId || parentConfig.mountId || "local";
        }

        // 设置会话的挂载点
        sessCfg.mountId = targetMountId;

        // 做个ID映射
        // 做子节点的ID映射
        // 并不需要考虑太多，如果有重复的映射直接覆盖就是了
        const walkAndMap = (pNode: any) => {
            pNode.mountId = targetMountId;
            this.sessionConfigsMapper[pNode._id] = pNode;
            this.sessionConfigsUUIDMapper[pNode.uuid] = pNode;
            pNode.subSessions.forEach((subSession: any) => {
                walkAndMap(subSession);
            });
        };

        walkAndMap(sessCfg);

        await this.saveSessionConfigsForMount(targetMountId);
    }

    /**
     * 移除会话配置
     * @param {SessionConfig|Object} sessCfg 会话配置
     */
    removeSessionConfig(sessCfg: any) {
        // TODO: add code here
        if (!(sessCfg instanceof SessionConfig)) {
            sessCfg = this.getSessionConfigById(sessCfg._id);
        }
        sessCfg._parent.removeSubSessionConfig(sessCfg);
        this.saveSessionConfigs();
    }

    createShellSessionConfig(name: string) {
        const sessConfig = new SessionConfig(name, SESSION_CONFIG_TYPE.NODE, {
            sessType: "shell"
        }, "");
        // sessConfig.on("remove", (sessCfgObj) => {
        //     this.handleSessionConfigRemove(sessCfgObj);
        // });
        // sessConfig.on("update", (sessCfgObj) => {
        //     this.handleSessionConfigUpdate(sessCfgObj);
        // });

        return sessConfig;
    }

    /**
     * 导入XShell会话配置
     */
    async importXShellSession() {
        // TODO: add code here
    }

    async exportConfig(path: string) {
        return await Storage.export("SESSIONS", path);
    }

    async importConfig(path: string) {
        try {
            await Storage.import(path, "SESSIONS");
            await this.loadSessionConfigs();
        } catch (e) {
            // skip
        }
        await this.saveSessionConfigs();
    }

    /**
     * 根据会话配置ID获取配置
     *
     * @param {Number} sessCfgId 会话配置Id
     * @return {SessionConfig}
     */
    getSessionConfigById(sessCfgId: any) {
        return this.sessionConfigsMapper[sessCfgId] || null;
    }

    /**
     * 根据会话配置UUID获取会话配置
     * @param {String} sessCfgUUID 会话配置UUID
     * @return {SessionConfig}
     */
    getSessionConfigByUUID(sessCfgUUID: string) {
        return this.sessionConfigsUUIDMapper[sessCfgUUID] || null;
    }

    /**
     * 根据会话实例ID获取会话实例
     * @param {Number} sessInstId 会话实例ID
     * @return {SessionInterface}
     */
    getSessionInstanceById(sessInstId: any) {
        return this.sessionInstancesMapper[sessInstId] || null;
    }

    /**
     * 添加配置和实例的关联
     *
     * @param {Number} cfgId 配置ID
     * @param {Number} instId 实例ID
     */
    _addInstAssociation(cfgId: any, instId: any) {
        /**
         * @type {Set}
         */
        let associatedSet = this.sessionConfigAssociated[cfgId];
        if (!associatedSet) {
            associatedSet = new Set([]);
            this.sessionConfigAssociated[cfgId] = associatedSet;
        }

        associatedSet.add(instId);
        this.sessionInstAssociated[instId] = cfgId;
    }

    /**
     * 移除实例ID和配置的关联
     *
     * @param {Number} instId 会话实例ID
     */
    _removeInstAssociation(instId: any) {
        const cfgId = this.sessionInstAssociated[instId];
        // cfgId必须是数字，否则是无效的或者不存在的，直接退出
        if (typeof cfgId !== "number") {
            return;
        }
        delete this.sessionInstAssociated[instId];
        /**
         * @type {Set}
         */
        let cfgAssociateSet = this.sessionConfigAssociated[cfgId];
        if (cfgAssociateSet) {
            cfgAssociateSet.delete(instId);
            if (cfgAssociateSet.size == 0) {
                // 已经不存在关联的实例了，所以直接把关系删除掉
                delete this.sessionConfigAssociated[cfgId];
            }
        }
    }

    /**
     * 添加会话到历史记录中
     * @param {String} sessionType 会话的类型
     * @param {SessionConfig} sessConfig 会话配置
     */
    addSessionToRecent(sessionType: string, sessConfig: any) {
        if (sessionType != SESSION_TYPES.SHELL) {
            return;
        }
        this.sessionRecent.addRecent(sessConfig.uuid, sessConfig.name);
    }

    /**
     * 添加一个会话创建的Job
     *
     * @param {Number} sessCfgId 会话配置ID
     * @return {WaitObject} 等待对象
     */
    addSessionInstanceCreateJob(sessCfgId: any) {
        let waitObj = new WaitObject();
        this.sessionCreateJobs[sessCfgId] = waitObj;
        return waitObj;
    }

    /**
     * 获取一个会话实例创建的Job（WaitObject对象）
     *
     * @param {Number} sessCfgId 会话配置ID
     */
    getSessionInstanceCreateJob(sessCfgId: any) {
        return this.sessionCreateJobs[sessCfgId];
    }

    /**
     * 会话实例创建完毕，删除此Job
     *
     * @param {Number} sessCfgId 会话配置ID
     */
    sessionInstanceCreateJobFinish(sessCfgId: any) {
        delete this.sessionCreateJobs[sessCfgId];
    }

    /**
     * 创建会话实例
     *
     * @param {SessionConfig} sessionConfig 会话配置
     * @param {Boolean} [background=false]  是否为后台会话，默认为false
     */
    async createSessionInstance(sessionConfig: any, background: boolean = false) {
        // 首先获取此会话配置有没有正在创建会话的Job
        let createJob = this.getSessionInstanceCreateJob(sessionConfig._id);
        if (createJob) {
            // 如果有直接等待就行了
            try {
                return await createJob.wait();
            } catch (e) {
                throw e;
            }
        }
        createJob = this.addSessionInstanceCreateJob(sessionConfig._id);

        let createParam = _.cloneDeep({
            name: sessionConfig.name,
            uuid: sessionConfig.uuid,
            connId: sessionConfig.connId === undefined ? -1 : sessionConfig.connId,
            ...sessionConfig.config
        });

        // _.cloneDeep breaks Proxy/complex objects like SFTPFileSystem instances.
        // Restore the original sftp reference if it was passed in the config.
        if (sessionConfig.config && sessionConfig.config.config && sessionConfig.config.config.sftp) {
            createParam.config.sftp = sessionConfig.config.config.sftp;
        }

        const factory = getSessionFactory(sessionConfig.config.sessType);
        if (!factory) {
            throw new Error(`Unknown session type: ${sessionConfig.config.sessType}`);
        }
        try {
            /**
             * @type {SessionInterface}
             */
            let instance = await factory.createInstance(createParam);
            let instId = sessInstanceIdGenerator.getNext()
            instance.setId(instId);
            instance.on("error", (err: any) => {
                console.error("Session error:", instance.name, err);
            });
            this.sessionInstancesMapper[instId] = instance;
            if (!background) {
                this.sessionInstances.push(instance);
            }
            // instance.on("close", () => {
            //     this.handleInstanceDestroy(instId);
            // });
            // 非配置型会话，内置页面会话时没有ID的
            if ("_id" in sessionConfig) {
                this._addInstAssociation(sessionConfig._id, instance.id)
            }

            // this.emit("instance-create", instance);
            EventBus.publish("instance-created", instance);

            this.addSessionToRecent(sessionConfig.config.sessType, sessionConfig);

            return instance;
        } catch (e) {
            createJob.reject(e);
            throw e;
        } finally {
            this.sessionInstanceCreateJobFinish(sessionConfig._id);
        }
    }

    /**
     * 创建欢迎会话实例
     */
    createWelcomeSessionInstance() {
        return this.createSessionInstance(new SessionConfig("Welcome", SESSION_CONFIG_TYPE.NODE, { sessType: SESSION_TYPES.WELCOME }));
    }

    createSFTPSessionInstance(sessionConfig: any) {
        const sftpSession = {
            ...sessionConfig.config
        };

        sftpSession.sessType = SESSION_TYPES.SFTP;
        let sftp_name = sftpSession.hostName === "" ? sftpSession.hostAddress : sftpSession.hostName;
        if (sftpSession.connId >= 0) {
            // reuse session uuid
            return this.createSessionInstance(new SessionConfig(sftp_name, SESSION_CONFIG_TYPE.NODE, sftpSession, "", sessionConfig.uuid));
        } else {
            return this.createSessionInstance(new SessionConfig(sftp_name, SESSION_CONFIG_TYPE.NODE, sftpSession));
        }

    }

    createSfpEditorSessionInstance(cfg: any) {
        cfg.sessType = SESSION_TYPES.EDITOR;
        return this.createSessionInstance(new SessionConfig(cfg.name, SESSION_CONFIG_TYPE.NODE, {
            sessType: SESSION_TYPES.EDITOR,
            config: cfg
        }));
    }

    /**
     * 创建登录会话实例
     */
    createLoginSessionInstance() {
        return this.createSessionInstance(new SessionConfig("Login", SESSION_CONFIG_TYPE.NODE, { sessType: SESSION_TYPES.LOGIN }));
    }

    createGlobalSettingSessionInstance() {
        return this.createSessionInstance(new SessionConfig("GlobalSetting", SESSION_CONFIG_TYPE.NODE, { sessType: SESSION_TYPES.GLOBALSETTING }));
    }

    /**
     * 移除一个实例
     *
     * @param {Number} instId 移除实例的ID
     */
    _removeInstance(instId: any) {
        delete this.sessionInstancesMapper[instId];
        let idx = this.sessionInstances.findIndex((val) => {
            return val.id == instId;
        });
        if (idx > -1) {
            this.sessionInstances.splice(idx, 1);
        }
        this._removeInstAssociation(instId);
    }

    handleInstanceDestroy(instId: any) {
        this._removeInstance(instId);
        EventBus.publish("instance-destroyed");
        // this.emit("instance-destroy");
    }

    /**
     * 复制一个会话实例
     *
     * @param {SessionInterface} fromSessionInstance 来源会话，复制该会话
     * @param {Boolean} [useSessionConfig]  使用会话的配置，如果使用配置则只使用来源会话的配置
     *                                      否则，直接复用来源的实例
     */
    duplicateSessionInstance(fromSessionInstance: any, _useSessionConfig: boolean = true) {
        // TODO: add code here
        let instId = fromSessionInstance.getId();
        let sessionCfg = this.getSessionConfigByInstanceId(instId);
        return this.createSessionInstance(sessionCfg);
    }

    async duplicateSshInstance(fromSessionInstance: any, _useSessionConfig: boolean = true) {
        let connId = -1;
        try {
            connId = await fromSessionInstance.getTermConnId();
        } catch (e) {
            console.log('duplicate ssh instance error ', e);
            return;
        }

        let instId = fromSessionInstance.getId();
        let sessionCfg = this.getSessionConfigByInstanceId(instId);
        return this.createSessionInstance({ connId, ...sessionCfg });
    }

    /**
     * 获取会话实例
     *
     * @param {SessionInterface | Number} instance 会话实例
     */
    getSessionInstance(instance: any) {
        if (typeof instance === "number") {
            return this.sessionInstances[instance] || null;
        }

        return instance;
    }

    /**
     * 获取会话配置
     *
     * @param {string} [mountId] 指定挂载点ID，不指定则返回默认（本地）挂载点
     * @return {SessionConfig[]}
     */
    getSessionConfigs(mountId: any = null): any[] {
        if (mountId) {
            const root = this.mountRoots.get(mountId);
            return root ? root.subSessions : [];
        }
        return this.sessionConfigsRoot.subSessions;
    }

    /**
     * 获取所有挂载点的根节点
     * @return {SessionConfig[]}
     */
    getMountRoots() {
        return Array.from(this.mountRoots.values());
    }

    /**
     * 获取指定挂载点的根节点
     * @param {string} mountId 
     * @return {SessionConfig|null}
     */
    getMountRoot(mountId: string) {
        return this.mountRoots.get(mountId) || null;
    }

    /**
     * 获取会话实例列表
     */
    getSessionIntances() {
        return this.sessionInstances;
    }

    /**
     * 根据会话实例获取对应的会话配置
     *
     * @param {Number} instId 会话实例
     * @return {SessionConfig}
     */
    getSessionConfigByInstanceId(instId: any) {
        const cfgId = this.sessionInstAssociated[instId];
        if (cfgId === undefined) {
            return null;
        }
        return this.sessionConfigsMapper[cfgId];
    }

    /**
     * 根据会话配置匹配会话实例
     * @param {SessionConfig} sessCfg 会话配置
     * @return {SessionInterface[]}
     */
    matchSessionInstanceByConfig(sessCfg: any) {
        let instSets = this.sessionConfigAssociated[sessCfg._id];
        if (!instSets || instSets.size === 0) {
            return null;
        }

        let matched = [];
        for (let inst of this.sessionInstances) {
            if (instSets.has(inst.id)) {
                matched.push(inst);
            }
        }

        return matched;
    }

    /**
     * 根据会话类型匹配会话实例
     * @param {String} sessType 类型名称
     * @return {SessionInterface[]}
     */
    matchSessionInstanceBySessionType(sessType: string) {
        return this.sessionInstances.filter(
            /**
             * @param {SessionInterface} instance
             */
            (instance) => {
                if (instance.type === sessType) {
                    return instance;
                }
            }
        )
    }

    getSessionRecent() {
        return this.sessionRecent;
    }
}

const sessionManager = new SessionManager();

export default sessionManager;
