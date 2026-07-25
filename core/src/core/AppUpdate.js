const semver = require('semver');
const { shell } = require("electron");
const { pull_app_version } = require('../utils/collect');
const { version }= require('../version')
const CoreUI = require("./CoreUI");

async function check_app_update() {
    let s_version = null;
    try{
        s_version = await pull_app_version();
    }catch(e){
        return;
    }
    if(!s_version) {
        return;
    }
    if(!semver.gt(s_version, version)) {
        return;
    }
    setTimeout(
        async ()=> {
            // notify to update 
            let res = await CoreUI.showMessageBox({
                title: 'NxShell',
                type: 'info',
                message: `Please update current version: ${version} to latest version: ${s_version} !`,
                buttons: ['Skip', 'Upgrade']
            })
            if(res.response == 1) {
                shell.openExternal('https://nxshell.github.io')
            }
        },
        1000*10
    )
    
    return;
}

module.exports = {
    check_app_update
}