const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');
const fs = require('fs');

// Load .env.local first, then fall back to .env
function loadEnv() {
  const envVars = {};
  const envFiles = ['.env', '.env.local'];
  for (const file of envFiles) {
    const filePath = path.resolve(__dirname, file);
    if (fs.existsSync(filePath)) {
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      for (const line of lines) {
        const match = line.replace(/\r/g, '').match(/^(EXPO_PUBLIC_[^=]+)=(.*)$/);
        if (match) envVars[match[1]] = match[2].trim();
      }
    }
  }
  return envVars;
}

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons']
      }
    },
    argv
  );

  // Add polyfills for Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
    "process": require.resolve("process/browser"),
    "util": require.resolve("util"),
    "assert": require.resolve("assert"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "url": require.resolve("url"),
    "vm": require.resolve("vm-browserify"),
    "fs": false,
    "net": false,
    "tls": false
  };

  // Add plugins for global variables
  const webpack = require('webpack');
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  // Inject EXPO_PUBLIC_ env variables so process.env works in the browser bundle
  const envVars = loadEnv();
  const defineEnv = {};
  for (const [key, value] of Object.entries(envVars)) {
    defineEnv[`process.env.${key}`] = JSON.stringify(value);
  }
  config.plugins.push(new webpack.DefinePlugin(defineEnv));

  return config;
};