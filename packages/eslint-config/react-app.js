import reactRefresh from "eslint-plugin-react-refresh";
import { reactLibrary } from "./react-library.js";

/**
 * Config for React applications. Adds the fast-refresh rules, which only apply
 * to code served by a dev server.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const reactApp = [
  ...reactLibrary,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
];

export default reactApp;
