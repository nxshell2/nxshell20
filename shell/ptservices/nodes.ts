import { NxNode } from "../common/nxsys/nodes";
import { getNodeClassByProtocol } from "./nodesimpl/registry";
import "./nodesimpl/sshnodes";
import "./nodesimpl/localnode";
import "./nodesimpl/ftpnode";
import "./nodesimpl/serialportnodes";
import "./nodesimpl/telnetnodes";
import "./nodesimpl/localshellnodes";
import { createObjectHandle, getObject } from "./nxobjs";
import { PROTOCOLS } from "../common/nxsys/consts";

const nodesInstances: any = Object.create(null);

function getNodeSessionInstanceByUUID(sessionUUID: string): any {
    const handler = nodesInstances[sessionUUID];
    if (typeof handler !== "number") {
        return null;
    }
    return getObject(handler);
}

function createNodeSessionInstance(sessionUUID: string, sessionConfig: any): number {
    let handler = nodesInstances[sessionUUID];
    if (typeof handler === "number") {
        return handler;
    }
    const NodeClass = getNodeClassByProtocol(sessionConfig.protocal);
    const instance = new NodeClass(sessionUUID, sessionConfig.protocal, sessionConfig);

    handler = createObjectHandle(instance);
    nodesInstances[sessionUUID] = handler;

    instance.on("dispose", () => {
        delete nodesInstances[sessionUUID];
    });

    return handler;
}

createNodeSessionInstance("", { protocal: PROTOCOLS.LOCAL, uuid: "" });

export {
    createNodeSessionInstance,
    getNodeSessionInstanceByUUID
};
