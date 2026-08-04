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
  ]),
  {
    rules: {
      // `@ts-nocheck` is the ratchet that lets tsconfig.json turn `checkJs` on
      // without 31 legacy .jsx files turning `tsc --noEmit` red — see the
      // comment at the top of that file. Banning it outright would mean either
      // no marker (and a broken gate) or an eslint-disable beside every one.
      // Requiring a description is the actual policy: a marker has to say what
      // it is hiding, so the backlog reads as a backlog.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-nocheck": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
]);

export default eslintConfig;
