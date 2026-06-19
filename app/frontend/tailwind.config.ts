import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "tailwindcss";

const tokenPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "design-tokens.json"
);
const tokens = JSON.parse(readFileSync(tokenPath, "utf8"));

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: tokens.colors.background.canvas,
        subtle: tokens.colors.background.subtle,
        githubDark: tokens.colors.background.dark,
        githubDarkElevated: tokens.colors.background.darkElevated,
        foreground: tokens.colors.text.primary,
        muted: tokens.colors.text.secondary,
        onDark: tokens.colors.text.onDark,
        onDarkMuted: tokens.colors.text.onDarkMuted,
        borderDefault: tokens.colors.border.default,
        link: tokens.colors.brand.primary,
        linkDark: tokens.colors.brand.primaryDark,
        success: tokens.colors.brand.success,
        danger: tokens.colors.brand.danger,
        attention: tokens.colors.brand.attention
      },
      borderRadius: {
        sm: tokens.borderRadius.sm,
        md: tokens.borderRadius.md,
        lg: tokens.borderRadius.lg
      },
      fontFamily: {
        sans: tokens.typography.fontFamily.primary.split(", "),
        mono: tokens.typography.fontFamily.mono.split(", ")
      },
      boxShadow: {
        card: tokens.shadow.card
      },
      spacing: tokens.spacing
    }
  },
  plugins: []
};

export default config;
