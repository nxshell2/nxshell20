import { fork, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import * as path from "path";
import { debugLog } from "../utils/debuglog";

class AppService extends EventEmitter {
    serviceProcess: ChildProcess | null = null;
    isTerminate: boolean = false;
    constructor(serviceModule: string, ...args: any[]) {
        super();

        let gidAndUid: any = {};
        if (process.platform == "linux") {
            gidAndUid.gid = process.getuid();
            gidAndUid.uid = process.getgid();
        }

        debugLog(`[AppService] forking AppLoader serviceModule=${serviceModule}`);
        this.serviceProcess = fork(path.join(__dirname, "./AppLoader.js"), [serviceModule, JSON.stringify(args)], {
            serialization: "advanced",
            detached: false,
            silent: true,
            ...gidAndUid
        });
        debugLog(`[AppService] forked pid=${this.serviceProcess.pid}`);
        if (this.serviceProcess.stdout) {
            this.serviceProcess.stdout.on("data", (data: Buffer) => {
                debugLog(`[AppService] stdout: ${data.toString()}`);
            });
        }
        if (this.serviceProcess.stderr) {
            this.serviceProcess.stderr.on("data", (data: Buffer) => {
                debugLog(`[AppService] stderr: ${data.toString()}`);
            });
        }
        this._initHandlers();
    }

    _initHandlers() {
        this.serviceProcess!.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
            debugLog(`[AppService] close code=${code} signal=${signal}`);
            this.isTerminate = true;
            this.emit("close");
        });

        this.serviceProcess!.on("disconnect", () => {
            debugLog(`[AppService] disconnect`);
            this.emit("close");
        });

        this.serviceProcess!.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
            debugLog(`[AppService] exit code=${code} signal=${signal}`);
            this.emit("exit");
        });

        this.serviceProcess!.on("error", (err: Error) => {
            debugLog(`[AppService] error: ${err.message}`);
        });

        this.serviceProcess!.on("message", (message: any) => {
            this.onMessage(message);
        });
    }

    sendMessage(message: any) {
        if (this.isTerminate) {
            return;
        }
        this.serviceProcess!.send(message);
    }

    onMessage(message: any) {
        this.emit("message", message);
    }

    exit(force: boolean) {
        if (force) {
            this.serviceProcess!.kill();
        } else {
            this.serviceProcess!.disconnect();
        }
    }
}

interface ServiceEntry {
    appInstance: AppService;
    ids: Set<number>;
}

class AppServiceManager {
    services: { [key: string]: ServiceEntry } = {};
    constructor() {
    }

    _getServiceInstanceEntry(serviceName: string): ServiceEntry | null {
        return this.services[serviceName] || null;
    }

    _addService(serviceName: string, appInstanceId: number, appInstance: AppService) {
        let serviceEntry = this._getServiceInstanceEntry(serviceName);
        if (serviceEntry === null) {
            serviceEntry = {
                appInstance,
                ids: new Set()
            };
        }
        serviceEntry.ids.add(appInstanceId);

        this.services[serviceName] = serviceEntry;
    }

    createService(serviceName: string, serviceModule: string, appInstanceId: number, ...args: any[]): AppService {
        let serviceInst: AppService;

        let serviceEntry = this._getServiceInstanceEntry(serviceName);
        if (!serviceEntry) {
            serviceInst = new AppService(serviceModule, ...args);
        } else {
            serviceInst = serviceEntry.appInstance;
        }

        this._addService(serviceName, appInstanceId, serviceInst);

        return serviceInst;
    }

    terminateService(serviceName: string, appInstanceId: number, force: boolean = false) {
        let serviceEntry = this._getServiceInstanceEntry(serviceName);
        if (!serviceEntry) {
            return;
        }

        serviceEntry.ids.delete(appInstanceId);
        if (serviceEntry.ids.size === 0) {
            serviceEntry.appInstance.exit(force);
            delete this.services[serviceName];
        }
    }

    getService(serviceName: string, appInstanceId: number): AppService {
        let serviceEntry = this._getServiceInstanceEntry(serviceName);
        if (!serviceEntry || !serviceEntry.ids.has(appInstanceId)) {
            throw new Error(`Can not found service: ${serviceName}-${appInstanceId}`);
        }
        return serviceEntry.appInstance;
    }

    terminateAllServices(force: boolean = true) {
        const names = Object.keys(this.services);
        for (let name of names) {
            let entry = this.services[name];
            if (entry) {
                entry.appInstance.exit(force);
            }
            delete this.services[name];
        }
    }
}

const appServiceManagerInstance = new AppServiceManager();

export {
    appServiceManagerInstance as AppServiceManager,
    AppService
};
