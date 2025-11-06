const path = require('path')
require("@hotwax/app-version-info")
module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        vue: path.resolve('./node_modules/vue')
      }
    },
  },
  devServer: {
    allowedHosts: "all",
    host: '0.0.0.0', // Allows access from any IP address
    port: 8100, // Or your specific port for Ionic/Vue
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws'
    },
  },
  runtimeCompiler: true,
  transpileDependencies: ['@hotwax/dxp-components']
}