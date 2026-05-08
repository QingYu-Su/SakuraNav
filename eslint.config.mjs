import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore build scripts and root-level Node.js scripts
    "scripts/**",
    "build-and-run.js",
    "print-banner.js",
    // VitePress docs
    "docs/.vitepress/dist/**",
    "docs/.vitepress/cache/**",
  ]),
  {
    rules: {
      // React Compiler 规则：effect 中的 setState 在某些模式下是合理的
      "react-hooks/set-state-in-effect": "warn",
      // 允许以 _ 开头的未使用变量
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
