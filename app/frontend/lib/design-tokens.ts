import tokens from "../../../assets/design-tokens.json";

export const githubTheme = tokens;

export const appTheme = {
  header: {
    backgroundColor: tokens.colors.background.dark,
    color: tokens.colors.text.onDark
  },
  workSurface: {
    backgroundColor: tokens.colors.background.canvas,
    borderColor: tokens.colors.border.default,
    borderRadius: tokens.borderRadius.md
  },
  primaryAction: tokens.components.button.primary
} as const;
