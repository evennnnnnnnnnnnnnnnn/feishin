import {
    AnyLibraryItems,
    ShareItemArgs,
    ShareItemResponse,
} from '@feishin/core/types/domain-types';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { api } from '/@/renderer/api';
import { MutationHookArgs } from '/@/renderer/lib/react-query';

export const useShareItem = (args: MutationHookArgs) => {
    const { options } = args || {};

    return useMutation<
        ShareItemResponse,
        AxiosError,
        ShareItemArgs,
        { previous: undefined | { items: AnyLibraryItems } }
    >({
        mutationFn: (args) => {
            return api.controller.shareItem({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        retry: false,
        ...options,
    });
};
