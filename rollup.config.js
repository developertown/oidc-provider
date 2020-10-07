import clear from "rollup-plugin-clear";
import ts from "rollup-plugin-typescript2";
import { builtinModules } from "module";
import pkg from "./package.json";

module.exports = {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: "esm",
      sourcemap: true,
    },
  ],
  external: [
    ...builtinModules,
    ...(pkg.dependencies ? Object.keys(pkg.dependencies) : []),
    ...(pkg.devDependencies ? Object.keys(pkg.devDependencies) : []),
    ...(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []),
  ],
  watch: {
    include: "src/**",
  },
  plugins: [
    clear({
      targets: ["dist"],
      watch: false,
    }),
    ts(),
  ],
};
