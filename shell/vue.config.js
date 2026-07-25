const path = require('path')
const webpack = require('webpack')

function resolve(dir = '') {
    return path.join(__dirname, './src', dir)
}

module.exports = {
    configureWebpack: {
        resolve: {
            extensions: ['.vue', '.ts', '.tsx', '.js', '.mjs', '.json'],
            fallback: {
                path: require.resolve('path-browserify'),
                stream: require.resolve('stream-browserify'),
                events: require.resolve('events'),
                buffer: require.resolve('buffer/'),
                util: require.resolve('util/'),
                process: require.resolve('process/browser'),
                os: false,
                crypto: false,
                fs: false,
                net: false,
                tls: false,
                child_process: false
            }
        },
        plugins: [
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser'
            }),
            new webpack.DefinePlugin({
                'powertools': 'window.powertools'
            })
        ],
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            appendTsSuffixTo: [/\.vue$/],
                            transpileOnly: true
                        }
                    }
                },
                {
                    test: /\.mjs$/,
                    include: /node_modules/,
                    type: "javascript/auto"
                }
            ]
        }
    },
    chainWebpack: (config) => {
        // set svg-sprite-loader
        config.module.rule('svg').exclude.add(resolve('icons')).end()
        config.module
            .rule('icons')
            .test(/\.svg$/)
            .include.add(resolve('icons'))
            .end()
            .use('svg-sprite-loader')
            .loader('svg-sprite-loader')
            .options({
                symbolId: 'icon-[name]'
            })
            .end()
    }
}
