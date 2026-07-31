import * as fs from 'fs';
import * as path from 'path';

export function isDirExists(dirPath: string): boolean {
    try {
        let stat = fs.lstatSync(dirPath);
        return stat.isDirectory();
    } catch (e) {
        return false;
    }
}

export function walkDir(root: string, filters?: string[]): string[] {
    if (!isDirExists(root)) {
        return [];
    }
    let dir = fs.opendirSync(root);
    let dirList: string[] = [];
    let dirent: fs.Dirent | null;
    while ((dirent = dir.readSync())) {
        if (dirent.isDirectory()) {
            let files = walkDir(path.join(root, dirent.name), filters);
            dirList = dirList.concat(files);
        }
        if (!dirent.isFile()) {
            continue;
        }
        let ext = path.extname(dirent.name);
        if (!filters || filters.includes(ext)) {
            dirList.push(path.join(root, dirent.name));
        }
    }
    dir.closeSync();

    return dirList;
}
