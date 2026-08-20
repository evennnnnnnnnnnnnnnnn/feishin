import { isLightColor } from '@feishin/ui/utils/is-light-color';
import stc from 'string-to-color';

const randomSeed = '121212';

export const stringToColor = (string: string) => {
    const hex = stc({ seed: randomSeed, string });

    return { color: hex, isLight: isLightColor(hex) };
};
