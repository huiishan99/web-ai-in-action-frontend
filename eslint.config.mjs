import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

eslintConfig.push({
  // The standalone CLI and shared config retain their CommonJS interface.
  files: ["backend/room_matching_script.js", "src/lib/mongodb-config.cjs", "tools/next-eslint-braces/index.cjs"],
  rules: { "@typescript-eslint/no-require-imports": "off" },
});

export default eslintConfig;
