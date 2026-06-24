import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

const eslintConfig = [
  {
    ignores: [
      "next-env.d.ts",
      ".next/**",
      ".vercel/**",
      "node_modules/**",
      "public/**",
      "script.js",
      "admin/**",
      "content/**"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-css-tags": "off"
    }
  }
];

export default eslintConfig;
