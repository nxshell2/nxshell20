const fs = require("fs");
const path = require("path");

const version = process.argv[2] || "1.0.0";
const portable = process.env.PORTABLE === "1" || process.argv[3] === "portable";
const weblink = "http://106.15.238.81:56789/oauth";

const out = { version, portable, weblink };
const dest = path.join(__dirname, "..", "core", "src", "version", "version.json");

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 4) + "\n");
console.log("Wrote version:", out);
