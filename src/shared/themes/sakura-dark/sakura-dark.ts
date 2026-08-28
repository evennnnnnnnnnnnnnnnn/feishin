import { AppThemeConfiguration } from '/@/shared/themes/app-theme-types';

export const sakuraDark: AppThemeConfiguration = {
    app: {
        'scrollbar-handle-active-background': 'rgba(247, 168, 196, 0.4)',
        'scrollbar-handle-background': 'rgba(168, 145, 185, 0.25)',
    },
    colors: {
        background: '#151218',
        'background-alternate': '#151218',
        foreground: '#ede7f2',
        'foreground-muted': '#8b8195',
        primary: '#f7a8c4', // sakura
        'state-error': '#f26d8f',
        'state-info': '#89c3e6',
        'state-success': '#84d1a8',
        'state-warning': '#f2c078',
        surface: '#1f1a26',
        'surface-foreground': '#a99cb8',
    },
    mode: 'dark',
};
