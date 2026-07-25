const {fork} = require("child_process");
const {EventEmitter} = require("events");
const path = require("path");


class AppService extends EventEmitter{
    serviceProcess = null;
    isTerminate = false;
    constructor(serviceModule, ...args) {
        super();

        let gidAndUid = {};
        if (process.platform == "linux") {
            gidAndUid.gid = process.getuid();
            gidAndUid.uid = process.getgid();
        }

        this.serviceProcess = fork(path.join(__dirname, "./AppLoader.js"), [serviceModule, args], {
            // 我们需要支持大的二进制块的传输，默认的JSON序列化不能满足我们的需求，
            // 所以，我们在此处使用高级序列化
            serialization: "advanced",
            detached: false,
            // stdio: ["pipe", "pipe", "pipe", "ipc"],
            // 继承应用会话的UID和GID
            ...gidAndUid
        });
        this._initHandlers();
    }

    _initHandlers() {
        this.serviceProcess.on("close", (code, signal) => {
            this.isTerminate = true;
            this.emit("close");
        });

        this.serviceProcess.on("disconnect", () => {
            this.emit("close");
        });

        this.serviceProcess.on("exit", (code, signal) => {
            this.emit("exit");
        });

        this.serviceProcess.on("message", (message) => {
            this.onMessage(message);
        });
    }

    sendMessage(message) {
        if (this.isTerminate) {
            return;
        }
        this.serviceProcess.send(message);
    }

    onMessage(message) {
        this.emit("message", message);
    }

    exit(force) {
        if (force) {
            this.serviceProcess.kill();
        } else {
            this.serviceProcess.disconnect();
        }
    }
}


class AppServiceManager {
    services = {}
    constructor() {
        // TODO
    }

    _getServiceInstanceEntry(serviceName) {
        return this.services[serviceName] || null;
    }

    _addService(serviceName, appInstanceId, appInstance) {
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

    createService(serviceName, serviceModule, appInstanceId, ...args) {
        let serviceInst;
        
        let serviceEntry = this._getServiceInstanceEntry(serviceName);
        if (!serviceEntry) {
            serviceInst = new AppService(serviceModule, ...args);
        } else {
            serviceInst = serviceEntry.appInstance;
        }

        this._addService(serviceName, appInstanceId, serviceInst);

        return serviceInst;
    }

    terminateService(serviceName, appInstanceId, force = false) {
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

    getService(serviceName, appInstanceId) {
        let serviceEntry = this._getServiceInstanceEntry(serviceName, appInstanceId);
        if (!serviceEntry || (!serviceEntry.ids.has(appInstanceId))) {
            throw new Error(`Can not found service: ${serviceName}-${appInstanceId}`);
        }
        return serviceEntry.appInstance;
    }
}


module.exports = {
    AppServiceManager: new AppServiceManager(),

    AppService
};
