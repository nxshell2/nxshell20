const path = require("path");

module.exports = {
    mode: "production",
    target: "electron-main",
    entry: {
        index: "./ptservices/index.js"
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        library: {
            type: 'commonjs'
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: "babel-loader"
                }
            },
	    {
        	test: /\.node$/,
        	loader: "node-loader",
      	    }
        ]
    },
    optimization: {
        minimize: true
    },
    externals: {
        "serialport": 'serialport',
        "node-pty": 'node-pty',
        "cpu-features": 'cpu-features'
    }
}
