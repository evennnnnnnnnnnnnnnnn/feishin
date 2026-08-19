import type { WebAudio } from '@feishin/core/types/types';

import { PlayerType } from '@feishin/core/types/types';

export function getVisualizerAudioNodes(
    webAudio: undefined | WebAudio,
    playbackType: PlayerType,
): AudioNode[] {
    if (!webAudio) return [];
    if (playbackType === PlayerType.LOCAL) {
        return webAudio.visualizerInputs ?? [];
    }
    return webAudio.gains;
}
