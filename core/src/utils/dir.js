const fs = require("fs");
const path = require("path");

function isDirExists(dirPath) {
    try {
        let stat = fs.lstatSync(dirPath);
        return stat.isDirectory();
    } catch (e) {
        return false;
    }
}

function walkDir(root, filters) {
    let dir = fs.opendirSync(root);
    let dirList = [];
    let dirent;
    while (dirent = dir.readSync()) {
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

module.exports = {
    isDirExists,
    walkDir
};
