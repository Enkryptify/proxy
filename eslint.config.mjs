import oxlint from "eslint-plugin-oxlint";

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**"],
  },
  oxlint.configs["flat/recommended"],
];
