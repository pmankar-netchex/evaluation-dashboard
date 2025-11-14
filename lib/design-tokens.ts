/**
 * Material Design 3 (Material You) Design Tokens
 * 
 * Re-exported from material-tokens for convenience
 */

import {
  materialColors,
  materialText,
  materialBackground,
  materialBorder,
  materialElevation,
  materialTypography,
  materialSpacing,
  materialComponents,
  combineMaterialClasses,
} from './material-tokens';

// Re-export Material tokens
export {
  materialColors,
  materialText,
  materialBackground,
  materialBorder,
  materialElevation,
  materialTypography,
  materialSpacing,
  materialComponents,
  combineMaterialClasses,
};

/**
 * Legacy mappings for backward compatibility
 * Maps to Material Design tokens
 */
export const colors = {
  text: {
    primary: materialText.primary,
    secondary: materialText.secondary,
    tertiary: materialText.secondary,
    muted: materialText.disabled,
    inverse: materialText.onPrimary,
  },
  bg: {
    primary: materialBackground.default,
    secondary: materialBackground.surfaceVariant,
    tertiary: 'bg-[#eeeeee]',
    muted: 'bg-[#e0e0e0]',
  },
  border: {
    default: materialBorder.default,
    muted: materialBorder.light,
    focus: materialBorder.primary,
  },
  interactive: {
    primary: {
      default: materialComponents.buttonPrimary.split(' ').slice(0, 2).join(' '),
      hover: 'hover:bg-[#1976d2]',
      focus: 'focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2',
      disabled: 'disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed',
    },
    secondary: {
      default: materialComponents.buttonSecondary.split(' ').slice(0, 2).join(' '),
      hover: 'hover:bg-[#00796b]',
      focus: 'focus:outline-none focus:ring-2 focus:ring-[#009688] focus:ring-offset-2',
      disabled: 'disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed',
    },
  },
  semantic: {
    success: `text-[#4caf50] bg-[#e8f5e9] border-[#4caf50]`,
    warning: `text-[#ff9800] bg-[#fff3e0] border-[#ff9800]`,
    error: `text-[#f44336] bg-[#ffebee] border-[#f44336]`,
    info: `text-[#2196f3] bg-[#e3f2fd] border-[#2196f3]`,
  },
} as const;

export const textStyles = {
  heading: materialText.primary,
  body: materialText.primary,
  label: materialText.secondary,
  help: materialText.secondary,
  placeholder: materialText.hint,
  timestamp: materialText.secondary,
} as const;

// Re-export Material tokens with shorter names for convenience
export const material = {
  text: materialText,
  bg: materialBackground,
  border: materialBorder,
  components: materialComponents,
  typography: materialTypography,
  colors: materialColors,
} as const;

export function combineClasses(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

