const axios = require('axios');
const os = require("os");
const version = require("../version");

async function report_app_statis() {
    const statis_url = version.weblink + '/open';
    try {
        const data = {
            type: os.type(),
            version: version.version,
            arch: os.arch(),
            platform: os.platform()
        };
        await axios.post(statis_url, data, {timeout: 6*1000});
        return true;
    }catch(e) {
    }
    return false;
}

async function pull_app_version() {
    const _url = version.weblink + '/version';
    try {
        let res = await axios.get(_url, {timeout: 6*1000});
        return res.data.version;
    }catch(e) {
    }
    return false;
}

module.exports = {
    report_app_statis,
    pull_app_version
}
