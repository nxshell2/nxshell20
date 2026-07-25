const {app, protocol, net, BrowserWindow} = require("electron");
const { report_app_statis } = require('../utils/collect');
const { check_app_update } = require('./AppUpdate');
require("./preloadIpc");

const Core = require("./Core");
const {PROTOCOL_APP} = require("./Protocol");

let core_appinstance = null;

// 当所有的窗口被关闭后，应用退出
app.on("window-all-closed", () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    // make sure all fork process exit success
    close_shell_instance();
    // 现在全部直接退出
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function process_macos_acitve_event() {
    if (process.platform !== 'darwin') {
        return;
    }
    app.on("activate", ()=> {
        if(BrowserWindow.getAllWindows().length === 0) {
            open_shell_instance();
        }
    })
}

async function open_shell_instance() {
    if(! core_appinstance) {
        core_appinstance =  await Core.startShell(...process.argv.slice(1));
    }
}

function close_shell_instance() {
    if(core_appinstance) {
        core_appinstance.close();
        core_appinstance = null;
    }
}

// set up app report interval 24h ago.
function setup_app_report_interval() {
    const interval = 24 * 60 * 60 * 1000;
    setInterval(()=> {
        report_app_statis();
    }, interval);
}

module.exports = {
    async initialize() {
        protocol.registerSchemesAsPrivileged([
            {scheme: PROTOCOL_APP, privileges: {standard: true, secure: true}}
        ]);
        // 等待electron完成初始化
        await app.whenReady();

        // 初始化核心部分
        await Core.initialize();

        // 核心初始化完成后，总是启动Shell
        // 启动Shell程序，并将应用启动参数带入到Shell
        await open_shell_instance();

        // process macos reopen case
        process_macos_acitve_event();

        // must end
        // check_app_update();
        report_app_statis();
        setup_app_report_interval();
    }
};
