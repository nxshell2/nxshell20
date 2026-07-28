interface IPCData {
    dest?: string;
    src?: string;
    body?: any;
}

type AppIPCHandler = (data: IPCData) => void;

class AppIPCExchange {
    recvHandlers: { [key: string]: AppIPCHandler } = {};

    onRecv(recvName: string, handler: AppIPCHandler) {
        if (!recvName || !handler || typeof handler !== "function") {
            return;
        }
        if (recvName in this.recvHandlers) {
            throw new Error("IPC Router already exists.");
        }
        this.recvHandlers[recvName] = handler;
    }

    sendTo(dest: string, src: string, body: any) {
        if (!dest || !src) {
            return;
        }

        if (!(dest in this.recvHandlers)) {
            return;
        }

        let handler = this.recvHandlers[dest];
        handler({ dest, src, body });
    }

    disconnect(recvName: string) {
        if (recvName in this.recvHandlers) {
            delete this.recvHandlers[recvName];
        }
    }
}

let globalExchange = new AppIPCExchange();

export function getGlobalExchange(): AppIPCExchange {
    return globalExchange;
}
