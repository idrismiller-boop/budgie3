import js from "@eslint/js";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: ["dist/**", "dev-dist/**", "node_modules/**", "vite.config.js", "eslint.config.js", "test-*.mjs", ".app.bundle.mjs"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { react, "react-hooks": hooks },
    settings: { react: { version: "18" } },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", ignoreRestSiblings: true }],
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      "react/jsx-no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
