const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const metadata = require("monaco-editor/esm/metadata");

console.log(metadata);

module.exports = function override(config, env) {
  config.plugins = [
    ...config.plugins,
    new MonacoWebpackPlugin({
      features: metadata.languages.map((feat) => "!" + feat.label),
      languages: metadata.languages.map((lang) => "!" + lang.label),
    }),
  ];

  return config;
};
