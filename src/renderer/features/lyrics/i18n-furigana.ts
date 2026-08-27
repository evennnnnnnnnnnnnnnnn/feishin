import i18n from '/@/i18n/i18n';

// New strings for the furigana reading-binding feature, added at runtime via
// addResourceBundle instead of editing en.json: en.json carries pre-existing
// uncommitted changes from a concurrent task on this branch and must not be
// touched (see jml-port room ground rules). Importing this module (any of
// its call sites do, at module scope) registers the strings once.
i18n.addResourceBundle(
    'en',
    'translation',
    {
        common: {
            bind: 'Bind',
            unbind: 'Unbind',
            update: 'Update',
        },
        setting: {
            enableFuriganaBindings: 'Enable furigana reading bindings',
            enableFuriganaBindings_description:
                'Click a kanji in the lyrics view to bind your own reading to it, rendered as furigana and synced to your account',
            furiganaApplyToIdentical: 'Apply to identical',
            furiganaApplyToIdenticalDescription:
                'Bind the same reading to every identical kanji span in this song',
            furiganaBindingReadingPlaceholder: 'Reading (kana)',
            furiganaBindingsAttribution:
                'Kanji dictionary data from KANJIDIC2, © EDRDG, licensed under CC BY-SA 4.0',
            furiganaBindingsVisible: 'Show your bindings by default',
            furiganaBindingsVisible_description:
                'When off, your bound readings stay hidden until you hover over the kanji (self-testing)',
            furiganaKunyomi: "Kun'yomi",
            furiganaOnyomi: "On'yomi",
            furiganaShowBinding: 'Show furigana',
            furiganaSuggestedReading: 'Suggested',
        },
    },
    true,
    false,
);
