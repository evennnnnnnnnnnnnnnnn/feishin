import { LibraryItem } from '@feishin/core/types/domain-types';
import { useCallback, useRef } from 'react';

import { useSetRatingMutation } from '/@/renderer/features/shared/mutations/set-rating-mutation';

export const useSetRating = () => {
    const setRatingMutation = useSetRatingMutation({});

    const setRatingMutationRef = useRef(setRatingMutation);
    setRatingMutationRef.current = setRatingMutation;

    const setRating = useCallback(
        (serverId: string, id: string[], itemType: LibraryItem, rating: number) => {
            setRatingMutationRef.current.mutate({
                apiClientProps: { serverId },
                query: { id, rating, type: itemType },
            });
        },
        [],
    );

    return setRating;
};
