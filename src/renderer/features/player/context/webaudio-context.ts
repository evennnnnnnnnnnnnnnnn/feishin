import { WebAudio } from '@feishin/core/types/types';
import { createContext } from 'react';

export const WebAudioContext = createContext<{
    setWebAudio?: (audio: undefined | WebAudio) => void;
    webAudio?: WebAudio;
}>({});
