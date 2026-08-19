import { JukeboxControlArgs, JukeboxControlResponse } from '@feishin/core/types/domain-types';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { api } from '/@/renderer/api';

export const useJukeboxControl = () => {
    return useMutation<JukeboxControlResponse, AxiosError, JukeboxControlArgs>({
        mutationFn: (args) => {
            return api.controller.jukeboxControl!({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
    });
};
