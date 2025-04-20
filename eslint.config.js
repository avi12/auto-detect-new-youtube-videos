import tsEslint from "typescript-eslint";
import eslint from "@eslint/js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin-js";

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsEslint.parser,
      globals: {
        ...globals.browser,
        ...globals.webextensions
      }
    },
    plugins: {
      "@stylistic/js": stylistic
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_"},
      ],
      "no-unused-vars": "off",
      quotes: ["warn", "double", {avoidEscape: true}],
      "quote-props": ["warn", "as-needed"],
      "prefer-const": "error",
      "@stylistic/js/indent": ["warn", 2]
    },
  },
  {
    ignores: [".wxt/", "build/", "node_modules/"],
  }
);

