const path = require("path");

const babelModule = {
    rules: [
        {
            test: /\.js$/,
            use: {
                loader: "babel-loader"
            }
        }
    ]
}

const main = {
    mode: "production",
    target: "electron-main",
    entry: {
        index: "./index.js"
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist")
    },
    module: babelModule,
    optimization: {
        minimize: true
    }
};

const loader = {
    mode: "production",
    target: "electron-main",
    entry: {
        AppLoader: "./src/core/AppLoader.js"
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist")
    },
    module: babelModule,
    optimization: {
        minimize: true
    }
};

const preload = {
    mode: "production",
    target: "electron-preload",
    entry: {
        AppClient: "./src/core/AppClient.js"
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist")
    },
    module: babelModule,
    optimization: {
        minimize: true
    }
}

module.exports = [main, loader, preload];
