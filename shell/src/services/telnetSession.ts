import { SESSION_TYPES, SessionInterface, registerSessionFactory } from "./session";
import {createNodeSessionInstance} from "./nxsys/nodes";


import WaitObject from "../../common/utils/waitObject";

/**
 * Shell会话
 * @extends {SessionInterface}
 */
class TelnetSession extends SessionInterface {
    cfg: any = null;
    connId: any = null;
    clientReady: any = null;
    terminal: any = null;
    control_channel: any = null;
    data_channel: any = null;
    control_channel_cb: any = null;
    data_channel_cb: any = null;
    send_data: any = null;
    resize_window: any = null;
    current_cols_rows: any = null;
    /**
     * Shell会话构造函数
     * @constructor
     * @param {Object} params Shell参数
     * @param {String} params.name 会话名称
     * @param {String} params.uuid 会话对应的UUID
     * @param {String} params.host 会话主机
     * @param {Number} params.port 会话端口
     * @param {String} [params.username] 用户名称，可选
     * @param {String} [params.password] 用户密码，可选
     * @param {String} [params.auth="password"] 认证方法
     */
    constructor(params: any) {
        super(params.name, SESSION_TYPES.SHELL);
        this.cfg = params;
        this.connId = params.connId;
    }

    async init() {
        this.emit("data", "Connect to server ...\r\n\n");
        
        this.clientReady = new WaitObject();
        this.resize_window = async (cols: any, rows: any) => {
            this.current_cols_rows = {cols, rows};
            if (!this.clientReady) return;
            try {
                await this.clientReady.wait();
            } catch (e) {
                return;
            }
            if (!this.terminal) return;
            try {
                await this.terminal.setWindowSize(cols, rows);
            } catch (e) {
                // terminal 已关闭时忽略 resize 失败
            }
        };
        this.on("resize", this.resize_window);

        let nodeInstance;
        try {
            nodeInstance = await createNodeSessionInstance(this.cfg.uuid, this.cfg);
            await nodeInstance.init();
        } catch (err: any) {
            this.emit("data", 'Connect to server failed! \r\n');
            this.emit("error", "Connect fail " + err.toString());
            return;
        }

        const service = powertools.getService();
        const control = service.createChannel();

        const unix_file = await service.getHsIPCHandle();
        const channel = await powertools.createHsIPC(unix_file);

        this.control_channel = control;
        this.data_channel = channel;
        
        this.control_channel_cb = (data: any) => {
            if(data.type === 'error') {
                this.emit('error', data.message);
            } else {
                this.emit("control", data);
            }
        }
        this.data_channel_cb = (data: any)=> {
            this.emit("data", data);
        }

        this.control_channel.on('data', this.control_channel_cb)
        this.data_channel.on('data', this.data_channel_cb)

        this.send_data = async (data: any) => {
            await this.data_channel.send(data);
        };
        this.on('send_data', this.send_data);

        let terminal;
        try {
            /**
             * @type {NxTerminalClient}
             */
            let connId = -1;
            if(this.connId >= 0) {
                connId = this.connId;
            }
            terminal = await nodeInstance.getTerminalInstance(connId, control.channelId);
            await terminal.init();
            this.clientReady.resolve();
        } catch (err: any) {
            // notify to frontend
            let msg = err.toString();
            this.emit('data', Buffer.from(msg));
            return;
        }
        this.terminal = terminal;

        this.terminal.bindDataChannel(channel.channelId);        
    }

    async sendControlData(data: any) {
        this.control_channel.send(data);
    }

    async openTunnel() {
        return await this.terminal.openTunnel();
    }

    async getTermConnId() {
        return await this.terminal.getConnId();
    }

    _close_terminal() {
        if(this.terminal) {
            this.terminal.dispose();
        }
        this.terminal = null;
        this.clientReady = null;
        this.off("send_data", this.send_data);
        this.off("resize", this.resize_window);
        this.control_channel.off("data", this.control_channel_cb);
        this.data_channel.off("data", this.data_channel_cb);
    }

    close() {
        if(this.terminal) {
            this._close_terminal();
        }
        // this.emit("close");
        super.close();
    }

    async duplicate() {
        let session = new TelnetSession(this.cfg);
        session.init();
        return session;
    }

    async refresh() {
        this._close_terminal();
        await this.init();
        if(this.current_cols_rows) {
            let { cols, rows } = this.current_cols_rows;
            this.resize_window(cols, rows)
        }
    }
}

async function createTelnetSession(params: any) {
    let session =  new TelnetSession(params);
    session.on("error", (err) => { console.error("TelnetSession error:", err) });
    session.init();
    return session;
}

registerSessionFactory(SESSION_TYPES.TELNET, createTelnetSession);
