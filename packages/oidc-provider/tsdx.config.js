/* eslint-disable @typescript-eslint/no-var-requires */
// Not transpiled with TypeScript or Babel, so use plain Es6/Node.js!
const replace = require("@rollup/plugin-replace");

module.exports = {
  rollup(config, opts) {
    config.plugins = config.plugins.map((p) =>
      p.name === "replace"
        ? replace({
            "process.env.NODE_ENV": JSON.stringify(opts.env),
            preventAssignment: true,
          })
        : p,
    );
    return config;
  },
};
