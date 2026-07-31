import * as util from 'util';
if (typeof (util as any).isDate !== 'function') {
    (util as any).isDate = (val: any) => val instanceof Date;
}

const { Client } = require('nxshell-ssh2');
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createObjectHandle } from "./nxobjs";
import { NxNodeServer } from "./nodesimpl/node";
import { SFTPFileSystem } from "./fs/sftp";

class StandaloneNodeServer extends NxNodeServer {
    _config: any;

    constructor(config: any) {
        super("standalone-sftp", "SSH2", config);
        this._config = config;
    }

    async _createConnection(): Promise<any> {
        const sshSession = new Client();
        const connConfig: any = {
            host: this._config.host,
            port: this._config.port || 22,
            username: this._config.username
        };

        if (this._config.authType === 'publickey' && this._config.privateKey) {
            let keyPath = this._config.privateKey;
            if (keyPath.startsWith('~')) {
                keyPath = path.join(os.homedir(), keyPath.slice(1));
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
            sshSession.on('error', (err: any) => reject(err));
            sshSession.connect(connConfig);
        });
    }

    _closeConnection(conn: any) {
        conn.end();
    }
}

async function createStandaloneSFTP(config: any): Promise<number> {
    const nodeServer = new StandaloneNodeServer(config);
    const connId = await nodeServer.createConnection();
    const sftpFs = new SFTPFileSystem(nodeServer, connId);
    await sftpFs.init();
    return createObjectHandle(sftpFs);
}

export {
    createStandaloneSFTP,
    StandaloneNodeServer
};
