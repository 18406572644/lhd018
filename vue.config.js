const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  outputDir: 'dist',
  publicPath: './',
  devServer: {
    port: 8080,
    hot: true
  },
  css: {
    loaderOptions: {
      sass: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  configureWebpack: {
    target: 'electron-renderer',
    externals: {
      electron: 'require("electron")',
      fs: 'require("fs")',
      path: 'require("path")'
    },
    resolve: {
      fallback: {
        fs: false,
        path: false,
        __dirname: false,
        __filename: false
      }
    },
    node: {
      __dirname: true,
      __filename: true
    }
  }
})
