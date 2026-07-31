const fs = require("fs");
const webpack = require("webpack");

const config = require('./webpack/webpack.config')

webpack(config, (err, stats) => {
    if (err) {
        console.error(err.stack || err);
        if (err.details) {
            console.error(err.details);
        }
        process.exitCode = 1;
        return;
    }

    const info = stats.toJson();

    if (stats.hasErrors()) {
        console.error(info.errors);
        process.exitCode = 1;
        return;
    }

    if (stats.hasWarnings()) {
        console.warn(info.warnings);
    }
    process.exitCode = 0;
});

