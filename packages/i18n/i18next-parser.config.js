// Reference: https://github.com/i18next/i18next-parser#options

export default {
    contextSeparator: '_',
    createOldCatalogs: true,
    customValueTemplate: null,
    defaultNamespace: 'translation',
    defaultValue: function (locale, namespace, key) {
        return key;
    },
    failOnUpdate: false,
    failOnWarnings: false,
    i18nextOptions: null,
    indentation: 4,
    input: [
        '../../src/renderer/components/**/*.{js,jsx,ts,tsx}',
        '../../src/renderer/features/**/*.{js,jsx,ts,tsx}',
        '../../src/renderer/layouts/**/*.{js,jsx,ts,tsx}',
        '!../../src/node_modules/**',
        '!../../src/**/*.prod.js',
    ],
    keepRemoved: false,
    keySeparator: '.',
    lexers: {
        default: ['JavascriptLexer'],
        handlebars: ['HandlebarsLexer'],
        hbs: ['HandlebarsLexer'],
        htm: ['HTMLLexer'],
        html: ['HTMLLexer'],
        js: ['JavascriptLexer'],
        jsx: ['JsxLexer'],
        mjs: ['JavascriptLexer'],
        ts: ['JavascriptLexer'],
        tsx: ['JsxLexer'],
    },
    lineEnding: 'auto',
    locales: ['en'],
    namespaceSeparator: false,
    output: 'packages/i18n/src/locales/$LOCALE.json',
    pluralSeparator: '_',
    resetDefaultValueLocale: 'en',
    sort: true,
    verbose: false,
};
