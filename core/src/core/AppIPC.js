/**
 * RenderProcess and AppService IPC
 * 解决渲染进程和应用服务之间通信的问题
 */


/**
 * 应用IPC处理器定义
 * 仅作接口定义，没有任何实现
 * @interface AppIPCHandler
 * @param {Object} data
 * @param {String} data.dest 目标
 * @param {String} data.src 来源
 * @param {String | Array | ArrayBuffer | Int8Array | Uint8Array} data.body 数据体
 */
function AppIPCHandler({dest, src, body}) {}


/**
 * App IPC交换机
 * @class AppIPCExchange
 */
class AppIPCExchange {
    /**
     * @memberof AppIPCExchange
     */
    recvHandlers = {}

    /**
     * 注册接收器
     * @param {String} recvName 接收器名称
     * @param {AppIPCHandler} handler IPC消息处理函数
     */
    onRecv (recvName, handler) {
        if (!recvName || (!handler) || typeof handler !== "function") {
            return;
        }
        if (recvName in this.recvHandlers) {
            throw new Error("IPC Router already exists.");
        }
        this.recvHandlers[recvName] = handler;
    }

    /**
     * 发送数据结构体
     * @param {String} dest 数据目标，在这里一般指向具体的服务
     * @param {String} src 数据来源
     * @param {String | Array | Uint8Array} body 数据体
     */
    sendTo(dest, src, body) {
        if ((!dest) || (!src)) {
            return;
        }

        if (!dest in this.recvHandlers) {
            return;
        }

        /** @type {AppIPCHandler} */
        let handler = this.recvHandlers[dest];
        handler({dest, src, body});
    }
    disconnect(recvName) {
        if(recvName in this.recvHandlers) {
            delete this.recvHandlers[recvName];
        }
    }
}

let globalExchange = new AppIPCExchange();

module.exports = {
    getGlobalExchange() {
        return globalExchange;
    }
};
