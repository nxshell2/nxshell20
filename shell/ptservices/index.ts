import * as util from 'util';
if (typeof (util as any).isDate !== 'function') {
    (util as any).isDate = (val: any) => val instanceof Date;
}

declare const powertools: any;

import { callObject, closeObject } from "./nxobjs";
import { createNodeSessionInstance, getNodeSessionInstanceByUUID } from "./nodes";
import { createDataTransfer } from "./dataTransfer";
import { createFileStorage } from "./localFileStorage";
import { getSerialPorts } from "./nodesimpl/serialportnodes";
import { createLogger } from "./logger";
import { getSystemFonts } from "./fontList";
import { createStandaloneSFTP } from "./standaloneSftp";

powertools.createHsIPCServer();

export default {
    add(v1: number, v2: number): number {
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
    getHsIPCHandle: () => { return powertools.getHsIPCConnectFile(); }
};
