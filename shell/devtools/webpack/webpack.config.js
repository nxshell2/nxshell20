const path = require('node:path')

module.exports = {
  mode: 'production',
  target: 'electron-main',
  entry: {
    index: './ptservices/index.ts'
  },
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs'
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        }
      },
      {
        test: /\.node$/,
        loader: 'node-loader'
      }
    ]
  },
  optimization: {
    minimize: true
  },
  externals: {
    'serialport': 'serialport',
    'node-pty': 'node-pty',
    'cpu-features': 'cpu-features'
  }
}
