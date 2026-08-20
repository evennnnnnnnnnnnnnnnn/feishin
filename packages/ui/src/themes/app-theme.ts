import { ayuDark } from '@feishin/ui/themes/ayu-dark/ayu-dark';
import { ayuLight } from '@feishin/ui/themes/ayu-light/ayu-light';
import { catppuccinLatte } from '@feishin/ui/themes/catppuccin-latte/catppuccin-latte';
import { catppuccinMocha } from '@feishin/ui/themes/catppuccin-mocha/catppuccin-mocha';
import { defaultTheme } from '@feishin/ui/themes/default';
import { defaultDark } from '@feishin/ui/themes/default-dark/default-dark';
import { defaultLight } from '@feishin/ui/themes/default-light/default-light';
import { dracula } from '@feishin/ui/themes/dracula/dracula';
import { everforestDark } from '@feishin/ui/themes/everforest-dark/everforest-dark';
import { everforestLight } from '@feishin/ui/themes/everforest-light/everforest-light';
import { githubDark } from '@feishin/ui/themes/github-dark/github-dark';
import { githubLight } from '@feishin/ui/themes/github-light/github-light';
import { glassyDark } from '@feishin/ui/themes/glassy-dark/glassy-dark';
import { gruvboxDark } from '@feishin/ui/themes/gruvbox-dark/gruvbox-dark';
import { gruvboxLight } from '@feishin/ui/themes/gruvbox-light/gruvbox-light';
import { highContrastDark } from '@feishin/ui/themes/high-contrast-dark/high-contrast-dark';
import { highContrastLight } from '@feishin/ui/themes/high-contrast-light/high-contrast-light';
import { materialDark } from '@feishin/ui/themes/material-dark/material-dark';
import { materialLight } from '@feishin/ui/themes/material-light/material-light';
import { monokai } from '@feishin/ui/themes/monokai/monokai';
import { nightOwl } from '@feishin/ui/themes/night-owl/night-owl';
import { nord } from '@feishin/ui/themes/nord/nord';
import { oneDark } from '@feishin/ui/themes/one-dark/one-dark';
import { rosePineDawn } from '@feishin/ui/themes/rose-pine-dawn/rose-pine-dawn';
import { rosePineMoon } from '@feishin/ui/themes/rose-pine-moon/rose-pine-moon';
import { rosePine } from '@feishin/ui/themes/rose-pine/rose-pine';
import { shadesOfPurple } from '@feishin/ui/themes/shades-of-purple/shades-of-purple';
import { solarizedDark } from '@feishin/ui/themes/solarized-dark/solarized-dark';
import { solarizedLight } from '@feishin/ui/themes/solarized-light/solarized-light';
import { tokyoNight } from '@feishin/ui/themes/tokyo-night/tokyo-night';
import { vscodeDarkPlus } from '@feishin/ui/themes/vscode-dark-plus/vscode-dark-plus';
import { vscodeLightPlus } from '@feishin/ui/themes/vscode-light-plus/vscode-light-plus';
import { zenburn } from '@feishin/ui/themes/zenburn/zenburn';
import merge from 'lodash/merge';

import { AppThemeConfiguration } from './app-theme-types';
import { AppTheme } from './app-theme-types';

export const appTheme: Record<AppTheme, AppThemeConfiguration> = {
    [AppTheme.AYU_DARK]: ayuDark,
    [AppTheme.AYU_LIGHT]: ayuLight,
    [AppTheme.CATPPUCCIN_LATTE]: catppuccinLatte,
    [AppTheme.CATPPUCCIN_MOCHA]: catppuccinMocha,
    [AppTheme.DEFAULT_DARK]: defaultDark,
    [AppTheme.DEFAULT_LIGHT]: defaultLight,
    [AppTheme.DRACULA]: dracula,
    [AppTheme.EVERFOREST_DARK]: everforestDark,
    [AppTheme.EVERFOREST_LIGHT]: everforestLight,
    [AppTheme.GITHUB_DARK]: githubDark,
    [AppTheme.GITHUB_LIGHT]: githubLight,
    [AppTheme.GLASSY_DARK]: glassyDark,
    [AppTheme.GRUVBOX_DARK]: gruvboxDark,
    [AppTheme.GRUVBOX_LIGHT]: gruvboxLight,
    [AppTheme.HIGH_CONTRAST_DARK]: highContrastDark,
    [AppTheme.HIGH_CONTRAST_LIGHT]: highContrastLight,
    [AppTheme.MATERIAL_DARK]: materialDark,
    [AppTheme.MATERIAL_LIGHT]: materialLight,
    [AppTheme.MONOKAI]: monokai,
    [AppTheme.NIGHT_OWL]: nightOwl,
    [AppTheme.NORD]: nord,
    [AppTheme.ONE_DARK]: oneDark,
    [AppTheme.ROSE_PINE]: rosePine,
    [AppTheme.ROSE_PINE_DAWN]: rosePineDawn,
    [AppTheme.ROSE_PINE_MOON]: rosePineMoon,
    [AppTheme.SHADES_OF_PURPLE]: shadesOfPurple,
    [AppTheme.SOLARIZED_DARK]: solarizedDark,
    [AppTheme.SOLARIZED_LIGHT]: solarizedLight,
    [AppTheme.TOKYO_NIGHT]: tokyoNight,
    [AppTheme.VSCODE_DARK_PLUS]: vscodeDarkPlus,
    [AppTheme.VSCODE_LIGHT_PLUS]: vscodeLightPlus,
    [AppTheme.ZENBURN]: zenburn,
};

// Custom themes loaded from disk (see custom-themes-store.ts) are registered
// here at runtime so getAppTheme can resolve `theme` values that aren't part
// of the built-in AppTheme enum. Kept separate from `appTheme` above so the
// built-in theme map stays a plain, statically-known record.
let customThemeRegistry: Record<string, AppThemeConfiguration> = {};

export const setCustomThemeRegistry = (registry: Record<string, AppThemeConfiguration>) => {
    customThemeRegistry = registry;
};

const resolveThemeConfig = (theme: string): AppThemeConfiguration | undefined => {
    return (appTheme as Record<string, AppThemeConfiguration>)[theme] ?? customThemeRegistry[theme];
};

export const getAppTheme = (theme: AppTheme | string): AppThemeConfiguration => {
    const themeConfig = resolveThemeConfig(theme) ?? appTheme[AppTheme.DEFAULT_DARK];

    return {
        app: merge({}, defaultTheme.app, themeConfig.app),
        colors: merge({}, defaultTheme.colors, themeConfig.colors),
        mantineOverride: merge({}, defaultTheme.mantineOverride, themeConfig.mantineOverride),
        mode: themeConfig.mode,
        stylesheets: themeConfig.stylesheets,
    };
};
