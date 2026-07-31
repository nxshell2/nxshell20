import axios from 'axios';
import * as os from 'os';
import * as version from '../version';

export async function report_app_statis(): Promise<boolean> {
    const statis_url = version.weblink + '/open';
    try {
        const data = {
            type: os.type(),
            version: version.version,
            arch: os.arch(),
            platform: os.platform()
        };
        await axios.post(statis_url, data, { timeout: 6 * 1000 });
        return true;
    } catch (e) {
    }
    return false;
}

export async function pull_app_version(): Promise<string | false> {
    const _url = version.weblink + '/version';
    try {
        let res = await axios.get(_url, { timeout: 6 * 1000 });
        return res.data.version;
    } catch (e) {
    }
    return false;
}
