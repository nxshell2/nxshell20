const path = require('node:path')

const tsModule = {
  rules: [
  {
    test: /\.ts$/,
    use: {
    loader: 'ts-loader',
    options: {
      transpileOnly: true,
    },
    },
  },
  ],
}

const resolve = {
  extensions: ['.ts', '.js', '.json'],
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
}

const main = {
  mode: 'production',
  target: 'electron-main',
  entry: {
  index: './index.ts',
  },
  output: {
  filename: '[name].js',
  path: path.resolve(__dirname, 'dist'),
  },
  module: tsModule,
  resolve,
  optimization: {
  minimize: true,
  nodeEnv: false,
  },
}

const loader = {
  mode: 'production',
  target: 'electron-main',
  entry: {
  AppLoader: './src/core/AppLoader.ts',
  },
  output: {
  filename: '[name].js',
  path: path.resolve(__dirname, 'dist'),
  },
  module: tsModule,
  resolve,
  optimization: {
  minimize: true,
  nodeEnv: false,
  },
}

const preload = {
  mode: 'production',
  target: 'electron-preload',
  entry: {
  AppClient: './src/core/AppClient.ts',
  },
  output: {
  filename: '[name].js',
  path: path.resolve(__dirname, 'dist'),
  },
  module: tsModule,
  resolve,
  optimization: {
  minimize: true,
  nodeEnv: false,
  },
}

module.exports = [main, loader, preload]
