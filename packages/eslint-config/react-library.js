import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import { base } from "./base.js";

/**
 * Config for browser-targeted React packages that ship to consumers.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const reactLibrary = [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
];

export default reactLibrary;
