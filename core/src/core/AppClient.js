const os = require("os");
const {ipcRenderer, clipboard, shell, desktopCapturer} = require("electron");
const {RPCClient, ChannelClient, dispatch} = require("./AppRPC");
const { version, portable, weblink}= require('../version')
const { createConnect } = require('./HSpeedIPC');
const WebSocket = require('./vnctcpproxy');

const PID = process.pid;
let allServices = {};

function createIPCSend(serviceName) {
    let ipcChannel = serviceName ? `ptIPC:${serviceName}` : "ptIPC";
    return function(data) {
        ipcRenderer.send(ipcChannel, data);
    }
}

function createRPC(serviceName) {
    const rpc = new RPCClient(createIPCSend(serviceName));

    return rpc;
}

function createChannel(serviceName) {
    const channelClient = new ChannelClient(createIPCSend(serviceName), PID);

    return channelClient;
}

function createIPCHandler(serviceName, serviceInstance) {
    let channelName = "ptIPC";
    if (serviceName) {
        channelName += ":" + serviceName;
    }

    ipcRenderer.removeAllListeners(channelName);
    const handler = (e, ...args) => {
        dispatch(args[0], 
            () => {},
            (rpcRetResponse) => {
                serviceInstance.rpcClient.dispatchResult(rpcRetResponse)
            },
            (channelData) => {
                serviceInstance.channelClient.dispatchChannelData(channelData);
            })
    };
    serviceInstance._ipcHandler = handler;
    ipcRenderer.on(channelName, handler);
}

class PowerToolsService {
    /** @type {RPCClient} */
    rpcClient = null;
    /** @type {ChannelClient} */
    channelClient = null;
    constructor(serviceName) {
        this.rpcClient = createRPC(serviceName);
        this.channelClient = createChannel(serviceName);

        createIPCHandler(serviceName, this);
    }
}

function createService(serviceName) {
    serviceName = serviceName || "";
    let serviceInstance = new PowerToolsService(serviceName);

    let instProxy = new Proxy(serviceInstance, {
        get(target, prop, recevier) {
            /** 
             * 保留一个createChannel调用
             * 意味着，在客户端，或者在服务端都不能再实现一个createChannel函数了
             */
            if (prop === "createChannel") {
                return function() {
                    return serviceInstance.channelClient.createChannel();
                };
            }

            return async function(...args) {
                return await serviceInstance.rpcClient.doCall(prop, ...args);
            }
        }
    });

    allServices[serviceName] = instProxy;

    return instProxy;
}

let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
async function start_capture() {
    let sources = await desktopCapturer.getSources({types: ['screen']});
    let source = sources.find(e => e.name === 'Screen');
    if(!source) {
        source = sources.find(e => e.name === 'Entire Screen');
    }
    if(!source && (sources.length !== 0)) {
        source = sources[0];
    }
    if(!source) {
        throw new Error('No screen found')
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: source.id
                }
            }
        });
        const options = { mimeType: 'video/webm; codecs=vp9' };
        mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorder.ondataavailable = (e)=> {
            recordedChunks.push(e.data);
        }
        mediaRecorder.start();
    } catch(err) {
        console.log('navigator get user media error ', err);
    }
}

async function stop_capture() {
    let buffer = null;
    return new Promise((resolve, reject)=> {
        if(mediaRecorder) {
            mediaRecorder.onstop = async ()=> {
                const blob = new Blob(recordedChunks, {
                    type: 'video/webm; codecs=vp9'
                });
                
                buffer = Buffer.from(await blob.arrayBuffer());
                mediaRecorder = null;
                recordedChunks = [];
                // release resource 
                stream.getTracks().forEach(function(track) {
                    track.stop();
                });
                resolve(buffer)
            };
            mediaRecorder.stop();
        } else {
            mediaRecorder = null;
            recordedChunks = [];
            resolve(buffer)
        }
    })
    
}

const powertools = {
    getService(serviceName) {
        let serviceInstance = allServices[serviceName || ""];
        if (!serviceInstance) {
            serviceInstance = createService(serviceName);
        }

        return serviceInstance;
    },

    minimizeWindow() {
        ipcRenderer.send("pt:window-minimize");
    },

    maximizeWindow() {
        ipcRenderer.send("pt:window-maximize");
    },

    unmaximizeWindow() {
        ipcRenderer.send("pt:window-unmaximize");
    },

    closeWindow() {
        ipcRenderer.send("pt:window-close");
    },

    isWindowMaximized() {
        return ipcRenderer.sendSync("pt:window-is-maximized");
    },

    onWindowEvent(event, callback) {
        ipcRenderer.on("pt:window-event", (e, ev) => {
            if (ev === event) {
                callback();
            }
        });
    },

    clipboardReadText() {
        return clipboard.readText();
    },

    clipboardWriteText(s) {
        return clipboard.writeText(s);
    },

    openExterUrl(url) {
        return shell.openExternal(url);
    },

    openDialog(url, options) {
        function optionsStringify() {
            if (!options) {
                return "";
            }
            
            return Object.keys(options).map(key => {
                return `${ key }=${ options[key] }`
            }).join(",")
        }
        return window.open(url, "modal", optionsStringify())
    },

    getAppDataDirty() {
        return ipcRenderer.sendSync("pt:get-path-sync", "appData");
    },

    getAppHomeDirty() {
        return ipcRenderer.sendSync("pt:get-path-sync", "home");
    },

    getLogDirty() {
        return ipcRenderer.sendSync("pt:get-path-sync", "logs");
    },

    getAppPath() {
        return ipcRenderer.sendSync("pt:get-app-path-sync");
    },

    openPath(url) {
        return shell.openPath(url);
    },

    showItemInFolder(url) {
        return shell.showItemInFolder(url);
    },

    getVersion() {
        return version;
    },

    getPortable() {
        return portable;
    },

    getWebLink() {
        return weblink;
    },

    createHsIPC(unix_file) {
        return createConnect(unix_file);
    },

    captureStart() {
        return start_capture();
    },

    captureStop() {
        return stop_capture();
    },

    getostype() {
        return os.type();
    }
};

async function initializeCoreService() {
    const coreService = powertools.getService("powershell-core");
    powertools.coreService = coreService;
    let viewManagerChannel = coreService.createChannel();
    await coreService.registerWindowProvider(viewManagerChannel.channelId);
    viewManagerChannel.on("data", ({reqId}) => {
        
    });
}

window.powertools = powertools;
window.WebSocket = WebSocket;
