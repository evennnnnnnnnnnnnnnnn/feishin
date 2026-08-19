import { SEPARATOR_STRING } from '@feishin/core/api/utils';

import { ItemDetailListCellProps } from './types';

import { formatPartialIsoDateUTC } from '/@/renderer/utils/format';

export const ReleaseDateColumn = ({ song }: ItemDetailListCellProps) => {
    const row = song as typeof song & { originalDate?: null | string };
    const releaseDate = row.releaseDate;
    if (!releaseDate) {
        return <>&nbsp;</>;
    }

    const originalDate =
        row.originalDate && row.originalDate !== releaseDate ? row.originalDate : null;

    if (originalDate) {
        return `${formatPartialIsoDateUTC(originalDate)}${SEPARATOR_STRING}${formatPartialIsoDateUTC(releaseDate)}`;
    }

    return formatPartialIsoDateUTC(releaseDate);
};
