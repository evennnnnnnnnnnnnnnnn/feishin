import { FolderQuery } from '@feishin/core/types/domain-types';
import { queryOptions } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { QueryHookArgs } from '/@/renderer/lib/react-query';

export const folderQueries = {
    folder: (args: QueryHookArgs<FolderQuery>) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getFolder({
                    apiClientProps: { serverId: args.serverId, signal },
                    query: args.query,
                });
            },
            queryKey: queryKeys.folders.folder(args.serverId, args.query),
            ...args.options,
        });
    },
};
