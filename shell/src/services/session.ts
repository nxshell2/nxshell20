import { EventEmitter } from "events";
import { isPromise } from "../../common/utils"

import * as EventBus from "./eventbus";

export const SESSION_TYPES = {
    WELCOME: "welcome",
    SHELL: "shell",
    SSH: "ssh",
    SERIALPORT: "serialport",
    SFTP: "sftp",
    FTP: "ftp",
    TELNET: 'telnet',
    LOCALSHELL: 'localshell',
    VNC: 'vnc',
    WEBDAV: 'webdav',
    LOGIN: "login",
    EDITOR: "editor",
    GLOBALSETTING: "globalsetting"
};

const sessionFactory: any = {};

class SessionFactory {
    type: string = "shell";
    factory: any = () => null;
    constructor (type: string, factory: any) {
        this.type = type;
        this.factory = factory;
    }

    /**
     * 创建一个实例
     * @param {Object} param 创建实例的参数
     * @param {String} param.name 实例名称
     * @return {Promise.<SessionInterface>}
     */
    async createInstance(param: any) {
        let ret = this.factory(param);

        let instance = ret;
        if (isPromise(ret)) {
            instance = await ret;
        }
        return instance;
    }
}

/**
 * 根据会话类型获取会话Factory
 * 
 * @param {String} type 会话类型
 * @return {Promise.<SessionFactory>}
 */
export function getSessionFactory(type: string) {
    if (!type || typeof type !== "string") {
        return null;
    }
    return sessionFactory[type.toUpperCase()] || null;
}

export function registerSessionFactory(type: string, factory: any) {
    console.info("register session factory:", type);
    if (typeof type !== "string") {
        return;
    }

    type = type.toUpperCase();
    if (!(type in SESSION_TYPES)) {
        throw new Error("invalid session type");
    }
    sessionFactory[type] = new SessionFactory(type, factory);
}

export class SessionInterface extends EventEmitter {
    name = "";
    id = "";
    type = "";
    closeCallBack: any = null;
    private pendingData: any[] = [];
    private pendingErrors: any[] = [];
    /**
     * 此会话实例引用的会话实例
     * @type {SessionInterface}
     */
    _ref: any = null;
    /**
     * 此会话实例被引用的会话实例
     * @type {SessionInterface[]}
     */
    refBySessions: any[] = [];
    constructor(name: string, type: string) {
        super();
        this.name = name;
        this.type = type;
        this.closeCallBack = null;
        this.on("newListener", (event: string | symbol, listener: (..._args: any[]) => void) => {
            if (event === "data") {
                const buffer = this.pendingData;
                this.pendingData = [];
                buffer.forEach((d) => listener(d));
            } else if (event === "error") {
                const buffer = this.pendingErrors;
                this.pendingErrors = [];
                buffer.forEach((e) => listener(e));
            }
        });
    }

    emit(event: string | symbol, ...args: any[]): boolean {
        if (event === "data" && this.listenerCount("data") === 0) {
            this.pendingData.push(args[0]);
            return true;
        }
        if (event === "error" && this.listenerCount("error") === 0) {
            this.pendingErrors.push(args[0]);
            return true;
        }
        return super.emit(event, ...args);
    }

    get router() {
        return {
            path: `/${this.type}/${this.id}`
        }
    }

    active() {
        this.emit("active")
    }

    updateName(newName: string) {
        this.name = newName;
    }

    /**
     * 引用一个会话实例
     * 
     * @param {SessionInterface} session 引用的会话实例
     */
    ref(session: any) {
        if (!(session instanceof SessionInterface)) {
            return;
        }
        this._ref = session;
        session.refBy(this);
    }

    /**
     * 添加到被引用列表
     * 
     * @param {SessionInterface} bySession 此会话被bySession引用
     */
    refBy(bySession: any) {
        this.refBySessions.push(bySession);
    }

    /**
     * 解除被引用
     * @param {SessionInterface} bySession 解除被bySession引用的状态
     */
    unRefBy(bySession: any) {
        if (!(bySession instanceof SessionInterface)) {
            return;
        }

        let index = this.refBySessions.findIndex((val) => {
            return val.id === bySession.id;
        });
        if (index > -1) {
            this.refBySessions.splice(index, 1);
        }
        // 已经没有其他会话引用自己了，所以可以释放所有资源，安心的离去了
        if (this.refBySessions.length === 0) {
            this.dispose();
        }
    }

    unref() {
        if (this._ref) {
            this._ref.unRefBy(this);
            this._ref = null;
        }
    }

    setId(instanceId: any) {
        this.id = instanceId;
    }

    getId() {
        return this.id;
    }
    
    /**
     * 关闭当前会话
     */
    close() {
        this.emit("close");
        EventBus.publish("instance-close", this);
    }

    _call_close_callback() {
        if(this.closeCallBack) {
            this.closeCallBack();
        }
    }

    beforeClose() {
        this._call_close_callback();
    }

    registerCloseCallback(fn: any) {
        this.closeCallBack = fn;
    }

    /**
     * 复制会话
     * @return {any}
     */
    duplicate() {}

    /**
     * 销毁会话
     * 因为会话很有可能会在duplicate时，被复制的会话引用
     * 所以当所有引用被解除时才是销毁会话的时机
     */
    dispose() {
        // 清除所有监听者
        this.removeAllListeners();
    }
}
