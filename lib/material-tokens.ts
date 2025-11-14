/**
 * Material Design 3 (Material You) Design Tokens
 * 
 * Google's Material Design System tokens for consistent styling
 * Reference: https://m3.material.io/
 */

/**
 * Material Design Color Tokens
 * Based on Material Design 3 color system
 */
export const materialColors = {
  // Primary colors (Blue)
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',  // Primary
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  
  // Secondary colors (Teal)
  secondary: {
    50: '#e0f2f1',
    100: '#b2dfdb',
    200: '#80cbc4',
    300: '#4db6ac',
    400: '#26a69a',
    500: '#009688',  // Secondary
    600: '#00897b',
    700: '#00796b',
    800: '#00695c',
    900: '#004d40',
  },
  
  // Surface colors
  surface: {
    default: '#ffffff',
    variant: '#f5f5f5',
    dim: '#e0e0e0',
    bright: '#ffffff',
  },
  
  // Error colors
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',  // Error
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },
  
  // Success colors
  success: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',  // Success
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  
  // Warning colors
  warning: {
    50: '#fff3e0',
    100: '#ffe0b2',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800',  // Warning
    600: '#fb8c00',
    700: '#f57c00',
    800: '#ef6c00',
    900: '#e65100',
  },
  
  // Neutral/Gray colors
  neutral: {
    0: '#ffffff',
    10: '#fafafa',
    20: '#f5f5f5',
    30: '#eeeeee',
    40: '#e0e0e0',
    50: '#bdbdbd',
    60: '#9e9e9e',
    70: '#757575',
    80: '#616161',
    90: '#424242',
    95: '#212121',
    100: '#000000',
  },
} as const;

/**
 * Material Design Text Colors
 */
export const materialText = {
  primary: 'text-[#212121]',           // On surface - high emphasis
  secondary: 'text-[#757575]',         // On surface - medium emphasis
  disabled: 'text-[#9e9e9e]',          // On surface - disabled
  hint: 'text-[#9e9e9e]',              // On surface - hint text
  onPrimary: 'text-white',             // On primary color
  onSecondary: 'text-white',           // On secondary color
  onError: 'text-white',               // On error color
  onSurface: 'text-[#212121]',         // On surface
  onSurfaceVariant: 'text-[#757575]', // On surface variant
} as const;

/**
 * Material Design Background Colors
 */
export const materialBackground = {
  default: 'bg-white',
  surface: 'bg-[#ffffff]',
  surfaceVariant: 'bg-[#f5f5f5]',
  primary: 'bg-[#2196f3]',
  secondary: 'bg-[#009688]',
  error: 'bg-[#f44336]',
} as const;

/**
 * Material Design Border Colors
 */
export const materialBorder = {
  default: 'border-[#e0e0e0]',
  light: 'border-[#eeeeee]',
  medium: 'border-[#bdbdbd]',
  dark: 'border-[#757575]',
  primary: 'border-[#2196f3]',
  error: 'border-[#f44336]',
} as const;

/**
 * Material Design Elevation (Shadows)
 */
export const materialElevation = {
  0: 'shadow-none',
  1: 'shadow-sm',
  2: 'shadow',
  3: 'shadow-md',
  4: 'shadow-lg',
  5: 'shadow-xl',
  6: 'shadow-2xl',
} as const;

/**
 * Material Design Typography
 * Following Material Design 3 type scale
 * Using explicit class names so Tailwind can detect them
 */
export const materialTypography = {
  displayLarge: 'text-[57px] font-normal leading-[64px]',      // 57px
  displayMedium: 'text-[45px] font-normal leading-[52px]',   // 45px
  displaySmall: 'text-[36px] font-normal leading-[44px]',      // 36px
  headlineLarge: 'text-[32px] font-normal leading-[40px]',          // 32px
  headlineMedium: 'text-[28px] font-normal leading-[36px]',     // 28px
  headlineSmall: 'text-[24px] font-normal leading-[32px]',          // 24px
  titleLarge: 'text-[22px] font-medium leading-[28px]',       // 22px
  titleMedium: 'text-base font-medium leading-6',           // 16px
  titleSmall: 'text-sm font-medium leading-5',      // 14px
  labelLarge: 'text-sm font-medium leading-5',      // 14px
  labelMedium: 'text-xs font-medium leading-4',         // 12px
  labelSmall: 'text-[11px] font-medium leading-4',        // 11px
  bodyLarge: 'text-base font-normal leading-6',            // 16px
  bodyMedium: 'text-sm font-normal leading-5',       // 14px
  bodySmall: 'text-xs font-normal leading-4',           // 12px
} as const;

/**
 * Material Design Spacing
 * Based on 4px grid system
 */
export const materialSpacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

/**
 * Material Design Interactive Components
 */
export const materialComponents = {
  // Primary Button
  buttonPrimary: [
    'bg-[#2196f3]',
    'text-white',
    'px-6 py-2',
    'rounded-full', // Material uses rounded-full for buttons
    'font-medium',
    'text-sm',
    'hover:bg-[#1976d2]',
    'focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2',
    'disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed',
    'transition-colors duration-200',
    'shadow-sm hover:shadow-md',
  ].join(' '),
  
  // Secondary Button
  buttonSecondary: [
    'bg-[#009688]',
    'text-white',
    'px-6 py-2',
    'rounded-full',
    'font-medium',
    'text-sm',
    'hover:bg-[#00796b]',
    'focus:outline-none focus:ring-2 focus:ring-[#009688] focus:ring-offset-2',
    'disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed',
    'transition-colors duration-200',
    'shadow-sm hover:shadow-md',
  ].join(' '),
  
  // Outlined Button
  buttonOutlined: [
    'bg-transparent',
    'border-2 border-[#2196f3]',
    'text-[#2196f3]',
    'px-6 py-2',
    'rounded-full',
    'font-medium',
    'text-sm',
    'hover:bg-[#e3f2fd]',
    'focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2',
    'disabled:border-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed',
    'transition-colors duration-200',
  ].join(' '),
  
  // Text Button
  buttonText: [
    'bg-transparent',
    'text-[#2196f3]',
    'px-4 py-2',
    'rounded-full',
    'font-medium',
    'text-sm',
    'hover:bg-[#e3f2fd]',
    'focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2',
    'disabled:text-[#9e9e9e] disabled:cursor-not-allowed',
    'transition-colors duration-200',
  ].join(' '),
  
  // Input Field
  input: [
    'w-full',
    'px-4 py-3',
    'border border-[#e0e0e0]',
    'rounded-lg',
    materialText.primary,
    'bg-white',
    'focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3]',
    'disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed',
    'transition-all duration-200',
  ].join(' '),
  
  // Card
  card: [
    'bg-white',
    'border border-[#eeeeee]',
    'rounded-lg',
    'p-6',
    'shadow-sm',
  ].join(' '),
  
  // Elevated Card
  cardElevated: [
    'bg-white',
    'rounded-lg',
    'p-6',
    'shadow-md',
  ].join(' '),
} as const;

/**
 * Helper function to combine Material classes
 */
export function combineMaterialClasses(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

