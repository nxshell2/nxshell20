/**
 * 独立 SFTP 连接
 * 直接复用 SFTPFileSystem，不重复造轮子
 */

// Polyfill: nxshell-ssh2 使用了已废弃的 util.isDate
// 必须在 require('nxshell-ssh2') 之前执行，否则 isDate 会被解构为 undefined
const util = require('util');
if (typeof util.isDate !== 'function') {
    util.isDate = (val) => val instanceof Date;
}

const { Client } = require('nxshell-ssh2');
const fs = require('fs');
const path = require('path');
const { createObjectHandle } = require("./nxobjs");
const { NxNodeServer } = require("./nodesimpl/node");
const { SFTPFileSystem } = require("./fs/sftp");

/**
 * 轻量 NxNodeServer，仅用于管理独立 SFTP 连接
 */
class StandaloneNodeServer extends NxNodeServer {
    constructor(config) {
        super("standalone-sftp", "SSH2", config);
        this._config = config;
    }

    async _createConnection() {
        const sshSession = new Client();
        const connConfig = {
            host: this._config.host,
            port: this._config.port || 22,
            username: this._config.username
        };

        if (this._config.authType === 'publickey' && this._config.privateKey) {
            let keyPath = this._config.privateKey;
            if (keyPath.startsWith('~')) {
                keyPath = path.join(require('os').homedir(), keyPath.slice(1));
            }
            connConfig.privateKey = fs.readFileSync(keyPath);
            if (this._config.passphrase) {
                connConfig.passphrase = this._config.passphrase;
            }
        } else {
            connConfig.password = this._config.password;
        }

        return new Promise((resolve, reject) => {
            sshSession.on('ready', () => resolve(sshSession));
            sshSession.on('error', (err) => reject(err));
            sshSession.connect(connConfig);
        });
    }

    _closeConnection(conn) {
        conn.end();
    }
}

/**
 * 创建独立 SFTP 连接，复用 SFTPFileSystem
 * @param {Object} config 
 * @returns {number} handle ID (SFTPFileSystem 实例)
 */
async function createStandaloneSFTP(config) {
    const nodeServer = new StandaloneNodeServer(config);
    const connId = await nodeServer.createConnection();

    const sftpFs = new SFTPFileSystem(nodeServer, connId);
    await sftpFs.init();

    return createObjectHandle(sftpFs);
}

module.exports = {
    createStandaloneSFTP,
    StandaloneNodeServer
};
