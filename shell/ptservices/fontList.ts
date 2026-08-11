const fontList: any = require('font-list');

let systemFonts: any = null;

async function getSystemFonts(): Promise<any> {
    if (systemFonts) {
        return systemFonts;
    }
    try {
        systemFonts = await fontList.getFonts({ disableQuoting: true });
    } catch (e) {
        console.error('[fontList] getFonts failed:', e);
        systemFonts = null;
    }
    return systemFonts;
}

export { getSystemFonts };
