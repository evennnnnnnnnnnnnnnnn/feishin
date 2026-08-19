import { replacePathPrefix } from '@feishin/core/api/utils';
import { useMemo } from 'react';

import { usePathReplace, useSettingsStore } from '/@/renderer/store/settings.store';

export const resolveSongPath = (path: null | string | undefined): null | string => {
    if (!path) {
        return null;
    }

    const { pathReplace, pathReplaceWith } = useSettingsStore.getState().general;

    return replacePathPrefix(path, pathReplace, pathReplaceWith);
};

export const useResolvedSongPath = (path: null | string | undefined): null | string => {
    const { pathReplace, pathReplaceWith } = usePathReplace();

    return useMemo(() => {
        if (!path) {
            return null;
        }

        return replacePathPrefix(path, pathReplace, pathReplaceWith);
    }, [path, pathReplace, pathReplaceWith]);
};
