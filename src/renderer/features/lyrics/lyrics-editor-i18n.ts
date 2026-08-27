import i18n from '/@/i18n/i18n';

// Registered at runtime instead of added to src/i18n/locales/en.json: that file
// carries an unrelated pre-existing uncommitted change (jml-port room ground
// rule 3) that must not be touched by this task. addResourceBundle deep-merges
// into the existing 'en' translation namespace without disturbing it.
i18n.addResourceBundle(
    'en',
    'translation',
    {
        lyricsEditor: {
            editText: 'Edit text…',
            editTime: 'Edit time…',
            preview: 'Play 1 second from this time',
            saveFailed: 'Could not save lyrics',
            setTimeToCurrent: 'Set time to current position',
            timePlaceholder: 'mm:ss.xx',
        },
    },
    true,
    false,
);
