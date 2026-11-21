import { config } from "@repo/eslint-config/base";

export default [
  ...config,
  {
    files: ["src/**/*.spec.ts"],
    languageOptions: {
      globals: {
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
      },
    },
  },
];
