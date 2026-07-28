const S_IFMT   =  0xF000;
const S_IFSOCK =  0xC000;
const S_IFLNK  =  0xA000;
const S_IFREG  =  0x8000;
const S_IFBLK  =  0x6000;
const S_IFDIR  =  0x4000;
const S_IFCHR  =  0x2000;
const S_IFIFO  =  0x1000;
const S_ISUID  =  0x800;
const S_ISGID  =  0x400;
const S_ISVTX  =  0x200;

const S_ISLNK = (m: number) => ((m & S_IFMT) == S_IFLNK);
const S_ISREG = (m: number) => ((m & S_IFMT) == S_IFREG);
const S_ISDIR = (m: number) => ((m & S_IFMT) == S_IFDIR);
const S_ISCHR = (m: number) => ((m & S_IFMT) == S_IFCHR);
const S_ISBLK = (m: number) => ((m & S_IFMT) == S_IFBLK);
const S_ISFIFO = (m: number) => ((m & S_IFMT) == S_IFIFO);
const S_ISSOCK = (m: number) => ((m & S_IFMT) == S_IFSOCK);

const S_IRWXU = 0x1C0;
const S_IRUSR = 0x100;
const S_IWUSR = 0x80;
const S_IXUSR = 0x40;

const S_IRWXG = 0x38;
const S_IRGRP = 0x20;
const S_IWGRP = 0x10;
const S_IXGRP = 0x8;

const S_IRWXO = 0x7;
const S_IROTH = 0x4;
const S_IWOTH = 0x2;
const S_IXOTH = 0x1;

const PERMS = [S_IRUSR, S_IWUSR, S_IXUSR, S_IRGRP, S_IWGRP, S_IXGRP, S_IROTH, S_IWOTH, S_IXOTH];
const PERMS_CHAR = ["r", "w", "x", "r", "w", "x", "r", "w", "x"];

class Stats {
    mode: number = 0;
    uid: number = 0;
    gid: number = 0;
    size: number = 0;
    atime: number = 0;
    mtime: number = 0;
}

class FStats {
    stats: Stats;
    constructor(stats: any) {
        this.stats = stats;
    }

    isBlockDevice() {
        return S_ISBLK(this.stats.mode);
    }

    isCharacterDevice() {
        return S_ISCHR(this.stats.mode);
    }

    isDirectory() {
        return S_ISDIR(this.stats.mode);
    }

    isFIFO() {
        return S_ISFIFO(this.stats.mode);
    }

    isFile() {
        return S_ISREG(this.stats.mode);
    }

    isSocket() {
        return S_ISSOCK(this.stats.mode);
    }

    isSymbolicLink() {
        return S_ISLNK(this.stats.mode);
    }

    getUid() {
        return this.stats.uid;
    }

    getGid() {
        return this.stats.gid;
    }

    getSize() {
        return this.stats.size;
    }

    getATime() {
        return this.stats.atime;
    }

    getMTime() {
        return this.stats.mtime;
    }

    get mtime() {
        return this.getMTime();
    }

    getPermsString() {
        const perms = PERMS.map((mask, idx) => {
            if (mask & this.stats.mode) {
                return PERMS_CHAR[idx];
            } else {
                return "-";
            }
        });
        let d = "-";
        if (this.isDirectory()) {
            d = 'd';
        }

        return `${d}${perms.join("")}`;
    }

    getPermsHex() {
        let hexStr = this.stats.mode.toString(8);
        return hexStr.slice(-3, hexStr.length + 1);
    }
}

export { FStats };
