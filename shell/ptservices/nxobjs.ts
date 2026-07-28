import * as utils from "../common/utils";
import { IdGenerator } from "../common/utils/idGenerator";

const objHandleIdGenerator = new IdGenerator();

const objectsRegistry: any = Object.create(null);

function createObjectHandle(object: any): number {
    const handleId = objHandleIdGenerator.getNext();
    objectsRegistry[handleId] = object;
    return handleId;
}

function getObject(handleId: number): any {
    let obj = objectsRegistry[handleId];
    if (!obj) {
        throw new Error("invalid handle id");
    }
    return obj;
}

async function closeObject(handleId: number): Promise<any> {
    try {
        let ret = callObject(handleId, "dispose");
        if (utils.isPromise(ret)) {
            ret = await ret;
        }
        return ret;
    } catch (err) {
        (console as any).err(err);
    } finally {
        if (objectsRegistry[handleId]) {
            delete objectsRegistry[handleId];
        }
    }
}

function callObject(handleId: number, method: string, ...args: any[]): any {
    let obj = getObject(handleId);
    return obj[method].call(obj, ...args);
}

export {
    createObjectHandle,
    getObject,
    closeObject,
    callObject
};
