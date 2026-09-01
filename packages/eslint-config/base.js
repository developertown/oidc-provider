import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint rules for every workspace in this repo. Packages should extend
 * `react-library` or `react-app` rather than this config directly.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const base = [
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // `verbatimModuleSyntax` is on repo-wide, so type-only imports have to be
      // marked as such or TypeScript refuses to compile them.
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
];

export default base;
