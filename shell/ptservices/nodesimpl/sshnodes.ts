import { NXTERMINAL_EVENTS, NxTerminal } from "../../common/nxsys/terminal";
import { PROTOCOLS, PROTOCOL_CAPS_MAP } from "../../common/nxsys/consts";
import { register } from "./registry";
import { createObjectHandle, closeObject } from "../nxobjs";
import { NxNodeServer } from "./node";
import { SFTPFileSystem } from "../fs/sftp";

declare const powertools: any;

const Client: any = require('nxshell-ssh2').Client;
const socksv5: any = require('nxshell-socksv5');
import * as net from 'net';
import * as os from 'os';

const basePort = 10080;
let usedPorts: number[] = [];

function _remove_used_port(port: number) {
    let index = port - basePort;
    const _index = usedPorts.indexOf(index);
    if (_index !== -1) {
        usedPorts.splice(_index, 1);
    }
}

function _get_unused_port(): number {
    let index = 0;
    while (true) {
        if (!usedPorts.includes(index)) {
            usedPorts.push(index);
            break;
        }
        index += 1;
    }
    return index + basePort;
}

class SSH2Terminal extends NxTerminal {
    parent: any = null;
    shellStream: any = null;
    connId: number = -1;
    wait_bind_msg_queue: any[] = [];
    server: any = null;
    socks5_port: number = -1;
    channel: any = null;

    constructor(parent: any, connId: number) {
        super();
        this.parent = parent;
        this.connId = connId;
    }

    _channel_write(data: any) {
        if (this.channel) {
            this.channel.send(data);
        } else {
            this.wait_bind_msg_queue.push(data);
        }
    }

    async _shell_stream(term: string, x11: any): Promise<any> {
        let conn = this.parent.refConnection(this.connId);
        return new Promise((resolve, reject) => {
            conn.shell({ term, cols: 80, rows: 24 }, { x11 }, (err: any, stream: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                stream.on("close", () => {
                    this.emit(NXTERMINAL_EVENTS.CLOSE);
                });
                stream.on("data", (data: any) => {
                    this._channel_write(data);
                });
                resolve(stream);
            });
        });
    }

    async init(termOpts: string = 'xterm-256color') {
        if (termOpts === 'xterm') {
            termOpts = 'xterm-256color';
        }
        const enable_x11 = this.parent.enable_x11;
        let shell_stream = null;
        if (enable_x11) {
            try {
                shell_stream = await this._shell_stream(termOpts, enable_x11);
            } catch (e) {
                shell_stream = null;
                this._channel_write("Warning: Forward X11 not enable \r\n");
            }
        }
        if (!shell_stream) {
            shell_stream = await this._shell_stream(termOpts, false);
        }
        this.shellStream = shell_stream;
    }

    async getConnId() {
        if (this.connId !== -1) {
            return this.connId;
        } else {
            throw new Error('ssh terminal conn id not exist');
        }
    }

    async bindDataChannel(channelId: number) {
        this.channel = powertools.bindHsIPCChannelById(channelId);
        this.channel.on('data', (d: any) => {
            this.sendData(d);
        });
        if (this.wait_bind_msg_queue.length) {
            this.wait_bind_msg_queue.forEach((ele) => {
                this.channel.send(ele);
            });
        }
        this.wait_bind_msg_queue = [];
    }

    async sendData(data: any) {
        if (this.shellStream) {
            this.shellStream.write(data);
        }
    }

    async setWindowSize(cols: number, rows: number) {
        this.shellStream.setWindow(rows, cols);
    }

    async openTunnel(): Promise<number> {
        if (this.server) {
            console.log("opentunnel is opened, and will closed");
            this._close_tunnel();
            return 0;
        }
        let conn = this.parent.refConnection(this.connId);

        const accept_fn = async (info: any, accept: any, deny: any) => {
            conn.forwardOut(info.srcAddr, info.srcPort, info.dstAddr, info.dstPort, async (err: any, stream: any) => {
                if (err) {
                    deny();
                    return;
                }
                let clientSocket = accept(true);
                if (!clientSocket) {
                    deny();
                    return;
                }
                clientSocket.on('error', (error: any) => {
                });
                stream.pipe(clientSocket).pipe(stream).on('close', () => {
                    if (clientSocket) {
                        clientSocket.end();
                        clientSocket = null;
                    }
                }).on('error', (error: any) => {
                    if (clientSocket) {
                        clientSocket.end();
                        clientSocket = null;
                    }
                });
            });
        };

        this.socks5_port = _get_unused_port();
        return new Promise((resolve, reject) => {
            this.server = socksv5.server.createServer(accept_fn).listen(this.socks5_port, 'localhost', () => {
                console.log('SOCKSv5 proxy server started on port ' + this.socks5_port);
                resolve(this.socks5_port);
            }).useAuth(socksv5.auth.none());

            this.server.on('error', (error: any) => {
                _remove_used_port(this.socks5_port);
                console.log('this server error ', error);
                this.server = null;
                reject(0);
            });
            this.server.on('close', () => {
                console.log('this server close ');
                _remove_used_port(this.socks5_port);
                this.server = null;
                reject(0);
            });
        });
    }

    _close_tunnel() {
        this.server.close();
        this.parent.closeConnection(this.connId);
        this.server = null;
        _remove_used_port(this.socks5_port);
    }

    async exec(command: string): Promise<{ stdout: string; stderr: string }> {
        const conn = this.parent.refConnection(this.connId);
        if (!conn) {
            throw new Error('SSH connection not available');
        }
        return new Promise((resolve, reject) => {
            conn.exec(command, (err: any, stream: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                let stdout = '';
                let stderr = '';
                stream.on('data', (data: any) => { stdout += data.toString(); });
                stream.stderr.on('data', (data: any) => { stderr += data.toString(); });
                stream.on('close', () => { resolve({ stdout, stderr }); });
            });
        });
    }

    async close() {
        if (this.shellStream) {
            this.shellStream.close();
            this.parent.closeConnection(this.connId);
        }
        if (this.server) {
            this._close_tunnel();
        }
    }

    async dispose() {
        await this.close();
        this.shellStream = null;
        this.emit("dispose");
        this.removeAllListeners();
    }
}

const algorithms = {
    kex: [
        'diffie-hellman-group14-sha256',
        'diffie-hellman-group16-sha512',
        'diffie-hellman-group18-sha512',
        'ecdh-sha2-nistp256',
        'ecdh-sha2-nistp384',
        'ecdh-sha2-nistp521',
        'diffie-hellman-group-exchange-sha256',
        'diffie-hellman-group14-sha1',
        'diffie-hellman-group1-sha1',
        'diffie-hellman-group-exchange-sha1',
    ],
    cipher: [
        'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
        'aes128-gcm', 'aes128-gcm@openssh.com',
        'aes256-gcm', 'aes256-gcm@openssh.com',
        'aes256-cbc', 'aes192-cbc', 'aes128-cbc',
        'blowfish-cbc', '3des-cbc',
        'arcfour256', 'arcfour128', 'cast128-cbc', 'arcfour'
    ],
    serverHostKey: [
        'ssh-ed25519', 'ssh-rsa',
        'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521',
        'ssh-dss'
    ],
    hmac: [
        'hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1', 'hmac-md5',
        'hmac-sha2-256-96', 'hmac-sha2-512-96', 'hmac-ripemd160',
        'hmac-sha1-96', 'hmac-md5-96'
    ]
};

function get_x11_display(): any {
    const plat = os.platform();
    let display = process.env.DISPLAY;

    if (plat === "linux" && display) {
        let host = display.split(':')[0];
        let screen = display.split(':')[1];
        let D = screen.split('.')[0];
        let S = screen.split('.')[1] || 0;
        host = host === "" ? 'host/unix' : host;
        D = parseInt(D);
        S = parseInt(S);
        if (host === "host/unix") {
            return { type: 'ipc', path: `/tmp/.X11-unix/X${D}` };
        } else {
            return { type: 'net', host: host, port: 6000 + D };
        }
    } else {
        return { type: 'net', host: 'localhost', port: 6000 };
    }
}

class SSHNodes extends NxNodeServer {
    caps: number = PROTOCOL_CAPS_MAP.SSH2;
    initialized: any = null;
    openedHandlers: number[] = [];
    fsHandlers: number[] = [];
    enable_x11: boolean = false;
    control_channel: any = null;

    constructor(uuid: string, connProtocol: string, sessionConfig: any) {
        super(uuid, connProtocol, sessionConfig);
    }

    async _createConnection() {
        const sshSession = new Client();
        const hostInfo = this.config;
        let authInfo: any = {};
        authInfo.host = hostInfo.hostAddress.trim();
        authInfo.port = hostInfo.hostPort || 22;
        authInfo.username = hostInfo.username;
        authInfo.keepaliveInterval = hostInfo.keepAliveInterval ? hostInfo.keepAliveInterval * 1000 : 5000;
        authInfo.keepaliveCountMax = hostInfo.keepAliveCountMax ? hostInfo.keepAliveCountMax : 3;
        authInfo.readyTimeout = hostInfo.readyTimeout;
        authInfo.algorithms = algorithms;

        if ((!hostInfo.username) || (hostInfo.username === '')) {
            hostInfo.username = await this.getUserName();
        }

        if (hostInfo.proxy === 'socksv5') {
            authInfo.sock = await this._create_socks5({
                host: authInfo.host,
                port: authInfo.port,
                proxyHost: hostInfo.proxyHost,
                proxyPort: hostInfo.proxyPort
            });
        }

        if (hostInfo.forward === 'x11') {
            this.enable_x11 = true;
            await this._forward_x11(sshSession);
        }

        const control_channel = this.control_channel;
        let connect_success = true;

        if (hostInfo.authType === "password") {
            authInfo = { ...authInfo, username: hostInfo.username, password: hostInfo.password };
            try {
                await this.__ssh_connect(authInfo, sshSession, null);
            } catch (e: any) {
                if (e.level === 'client-authentication') {
                    connect_success = false;
                } else {
                    throw e;
                }
            }
        } else if (hostInfo.authType === "cert") {
            authInfo = { ...authInfo, username: hostInfo.username, privateKey: hostInfo.cert, passphrase: hostInfo.passphrase };
            try {
                await this.__ssh_connect(authInfo, sshSession, null);
            } catch (e: any) {
                if (e.level === 'client-authentication') {
                    connect_success = false;
                } else {
                    throw e;
                }
            }
        } else if (hostInfo.authType === "keyboard-interactive") {
            authInfo.readyTimeout = 60 * 1000;
            authInfo.authHandler = (methodsLeft: any, ps: any, cb: any) => {
                if (methodsLeft == null) {
                    return { type: 'none', username: hostInfo.username };
                } else {
                    this.sendWaitUserAuth(methodsLeft, cb, hostInfo.username);
                }
            };
            await this.__ssh_connect(authInfo, sshSession, control_channel);
        }

        if (!connect_success) {
            authInfo.username = await this.getUserName();
            authInfo.readyTimeout = 60 * 1000;
            authInfo.authHandler = (methodsLeft: any, ps: any, cb: any) => {
                if (methodsLeft == null) {
                    return { type: 'none', username: authInfo.username };
                } else {
                    this.sendWaitUserAuth(methodsLeft, cb, authInfo.username);
                }
            };
            await this.__ssh_connect(authInfo, sshSession, control_channel);
        }

        if (hostInfo.forwardin === 'forwardin') {
            this._forward_in(sshSession, hostInfo.forwardInRemoteHost, hostInfo.forwardInRemotePort, hostInfo.forwardInLocalHost, hostInfo.forwardInLocalPort);
        }
        return sshSession;
    }

    async __ssh_connect(authInfo: any, sshSession: any, control_channel: any) {
        return await new Promise((resolve, reject) => {
            sshSession.on('close', () => {
                if (control_channel) {
                    control_channel.send({ type: 'error', message: 'Network is disconnected' });
                }
            });
            sshSession.on("ready", () => {
                resolve(sshSession);
            }).on("error", (err: any) => {
                console.log("Error:", err);
                reject(err);
            }).connect(authInfo);
        });
    }

    async _forward_in(sshConn: any, remote_ip: any, remote_port: any, local_ip: any, local_port: any) {
        await new Promise((resolve, reject) => {
            sshConn.forwardIn(remote_ip, remote_port, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Ssh server listen on ${remote_ip}:${remote_port}`);
                    resolve(true);
                }
            });
        });

        sshConn.on('tcp connection', async (info: any, accept: any, reject: any) => {
            let rstream = accept();
            let lstream: any = null;
            try {
                lstream = await this._create_loacl_connect(local_ip, local_port);
            } catch (e) {
                console.log('connet local error ', e);
                rstream.end();
            }
            rstream.pipe(lstream).pipe(rstream).on('close', () => {
                if (lstream) { lstream.end(); lstream = null; }
                if (rstream) { rstream.end(); rstream = null; }
            }).on('error', (error: any) => {
                if (lstream) { lstream.end(); lstream = null; }
                if (rstream) { rstream.end(); rstream = null; }
            });
        });
    }

    async _create_loacl_connect(ip: any, port: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.connect(port, ip, () => {
                resolve(socket);
            });
            socket.on('error', (err: any) => {
                reject(err);
            });
        });
    }

    _create_socks5(proxy: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const _c = socksv5.client.connect({
                host: proxy.host,
                port: proxy.port,
                proxyHost: proxy.proxyHost,
                proxyPort: proxy.proxyPort,
                auths: [socksv5.auth.none()]
            }, function (socket: any) {
                resolve(socket);
            });
            _c.on('error', (e: any) => {
                console.log('create socks5 error ', e);
                reject(e);
            });
        });
    }

    async _forward_x11(session: any) {
        session.on('x11', (info: any, accept: any, reject: any) => {
            const xserversock = new net.Socket();
            xserversock.on('connect', () => {
                const xclientsock = accept();
                xclientsock.pipe(xserversock).pipe(xclientsock);
            });
            const display = get_x11_display();
            if (display.type === 'net') {
                xserversock.connect(display.port, display.host);
            } else {
                xserversock.connect(display.path);
            }
        });
    }

    async getUserName(): Promise<string> {
        let r = await new Promise<any>((s, r) => {
            this.control_channel.on('data', (d: any) => {
                s(d);
            });
            this.control_channel.send({ type: 'username' });
        });
        if (r.type == "username") {
            return r.username;
        } else {
            throw new Error('username invalid');
        }
    }

    async sendWaitUserAuth(data: any, cb: any, username: string) {
        let r = await new Promise<any>((s, r) => {
            this.control_channel.on('data', (d: any) => {
                s(d);
            });
            this.control_channel.send({ type: 'authDialog', data: data, username: username });
        });

        if (r.type === 'password') {
            cb({ type: 'password', username: r.username, password: r.password });
        } else if (r.type === 'publickey') {
            cb({ type: 'publickey', username: r.username, key: r.publickey, passphrase: r.passphrase });
        } else if (r.type === 'keyboard-interactive') {
            cb({
                type: 'keyboard-interactive',
                username: r.username,
                prompt: (name: any, instructions: any, instructionsLang: any, prompts: any, finish: any) => {
                    this.sendWaitPrompt(prompts, finish);
                }
            });
        } else {
            cb(false);
        }
    }

    async sendWaitPrompt(data: any, finish: any) {
        let r = await new Promise<any>((s, r) => {
            this.control_channel.on('data', (d: any) => {
                s(d);
            });
            this.control_channel.send({ type: 'authPrompt', data: data });
        });
        if (r.type === "prompt") {
            finish(r.data);
        } else {
            finish(false);
        }
    }

    _closeConnection(conn: any) {
        conn.end();
    }

    async init() {
    }

    _removeOpenedHandler(handler: number) {
        const idx = this.openedHandlers.findIndex(val => val === handler);
        if (idx > -1) {
            this.openedHandlers.splice(idx, 1);
        }
    }

    async _prepareConnection(reuseConnId: number): Promise<number> {
        let connId = reuseConnId;
        if (reuseConnId === -1) {
            connId = await this.createConnection();
        }
        return connId;
    }

    async getTerminalInstance(reuseConnId: number = -1, ch?: number): Promise<number> {
        let control_channel = powertools.bindChannelByPeerId(ch);
        this.control_channel = control_channel;
        let connId = await this._prepareConnection(reuseConnId);
        const terminal = new SSH2Terminal(this, connId);
        const handler = createObjectHandle(terminal);
        this.openedHandlers.push(handler);
        terminal.once("dispose", () => {
            this._removeOpenedHandler(handler);
        });
        terminal.on("close", () => {
            control_channel.send({ type: 'error', message: 'Session is disconnected' });
        });
        return handler;
    }

    async getFSInstance(reuseConnId: number = -1, ch?: number): Promise<number> {
        this.control_channel = powertools.bindChannelByPeerId(ch);
        const connId = await this._prepareConnection(reuseConnId);
        const fs = new SFTPFileSystem(this, connId);
        const handler = createObjectHandle(fs);
        this.openedHandlers.push(handler);
        fs.once("dispose", () => {
            this._removeOpenedHandler(handler);
        });
        return handler;
    }

    async getNetInstance(reuseConnId: number = -1) {}
    async getGUIInstance(reuseConnId: number = -1) {}
    async getUserInstance(reuseConnId: number = -1) {}

    getPathLib() {
        return super.getPathLib().posix;
    }

    dispose() {
        if (this.openedHandlers.length) {
            for (let i = 0; i < this.openedHandlers.length; i++) {
                const handleId = this.openedHandlers[i];
                closeObject(handleId);
            }
        }
        this.emit("dispose");
        this.removeAllListeners();
    }
}

register(PROTOCOLS.SSH2, SSHNodes);
register(PROTOCOLS.SSH, SSHNodes);
