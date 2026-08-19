import { PlayerType } from '@feishin/core/types/types';
import { ipcMain } from 'electron';

import { store } from '../settings';

let isLocalVisualizerSurfaceVisible = false;

export const setLocalVisualizerSurfaceVisible = (visible: boolean) => {
    isLocalVisualizerSurfaceVisible = visible;
};

export const canHandleVisualizerDisplayMedia = (): boolean => {
    const playbackType = store.get('playbackType', PlayerType.WEB) as PlayerType;

    if (playbackType !== PlayerType.LOCAL) {
        return false;
    }

    return isLocalVisualizerSurfaceVisible;
};

ipcMain.on('visualizer-set-local-surface-visible', (_event, visible: boolean) => {
    setLocalVisualizerSurfaceVisible(Boolean(visible));
});
