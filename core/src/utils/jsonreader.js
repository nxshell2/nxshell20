const fs = require("fs");

exports.read = function read (jsonPath) {
    const jsonString = fs.readFileSync(jsonPath, { encoding: "utf8"});
    return JSON.parse(jsonString);
}
