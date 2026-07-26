// Polyfill: nxshell-ssh2 使用了已废弃的 util.isDate
// 必须在所有 require 之前执行，否则 isDate 会被解构为 undefined
const _util = require('util');
if (typeof _util.isDate !== 'function') {
    _util.isDate = (val) => val instanceof Date;
}

const { callObject, closeObject } = require("./nxobjs");
const { createNodeSessionInstance, getNodeSessionInstanceByUUID } = require("./nodes");
const { createDataTransfer } = require("./dataTransfer");
const { createFileStorage } = require("./localFileStorage");
const { getSerialPorts } = require("./nodesimpl/serialportnodes");
const { createLogger } = require("./logger");
const { getSystemFonts } = require("./fontList");
const { createStandaloneSFTP } = require("./standaloneSftp");

powertools.createHsIPCServer();

module.exports = {
    add(v1, v2) {
        return v1 + v2;
    },
    callObject,
    closeObject,
    createNodeSessionInstance,
    getNodeSessionInstanceByUUID,
    createDataTransfer,
    createFileStorage,
    getSerialPorts,
    createLogger,
    getSystemFonts,
    createStandaloneSFTP,
    getHsIPCHandle: () => { return powertools.getHsIPCConnectFile() }
};
