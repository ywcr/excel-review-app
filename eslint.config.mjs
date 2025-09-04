import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // 禁用所有常见的 ESLint 规则
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",
      "react/jsx-key": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "@next/next/no-img-element": "off",
      "prefer-const": "off",
      "no-unused-vars": "off",
      "no-console": "off",
      // 通用规则关闭
      "no-undef": "off",
      "no-redeclare": "off",
      "no-unreachable": "off",
    },
  },
];

export default eslintConfig;
