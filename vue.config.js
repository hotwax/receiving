module.exports = {
  devServer: {
    hot: false,
    liveReload: false
  },
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableLegacy: true,
      runtimeOnly: true,
      compositionOnly: false,
      fullInstall: true,
      enableInSFC: true
    }
  }
}
