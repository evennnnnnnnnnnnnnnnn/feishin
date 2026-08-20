import { hasFeature } from '@feishin/core/api/utils';
import {
    CreatePlaylistBody,
    CreatePlaylistResponse,
    ServerType,
} from '@feishin/core/types/domain-types';
import { ServerFeature } from '@feishin/core/types/features-types';
import { Group } from '@feishin/ui/components/group/group';
import { ModalButton } from '@feishin/ui/components/modal/model-shared';
import { Stack } from '@feishin/ui/components/stack/stack';
import { Switch } from '@feishin/ui/components/switch/switch';
import { TextInput } from '@feishin/ui/components/text-input/text-input';
import { toast } from '@feishin/ui/components/toast/toast';
import { useForm } from '@feishin/ui/hooks/use-form';
import { useTranslation } from 'react-i18next';

import { useCreatePlaylist } from '/@/renderer/features/playlists/mutations/create-playlist-mutation';
import { useCurrentServer } from '/@/renderer/store';

interface SaveAsPlaylistFormProps {
    body: Partial<CreatePlaylistBody>;
    onCancel: () => void;
    onSuccess: (data: CreatePlaylistResponse) => void;
    serverId?: string;
}

export const SaveAsPlaylistForm = ({
    body,
    onCancel,
    onSuccess,
    serverId,
}: SaveAsPlaylistFormProps) => {
    const { t } = useTranslation();
    const mutation = useCreatePlaylist({});
    const server = useCurrentServer();

    const form = useForm<CreatePlaylistBody>({
        initialValues: {
            comment: body.comment || '',
            name: body.name || '',
            public: body.public,
            queryBuilderRules: body.queryBuilderRules,
        },
    });

    const handleSubmit = form.onSubmit((values) => {
        mutation.mutate(
            { apiClientProps: { serverId: serverId || '' }, body: values },
            {
                onError: (err) => {
                    toast.error({
                        message: err.message,
                        title: t('error.genericError'),
                    });
                },
                onSuccess: (data) => {
                    toast.success({
                        message: t('form.createPlaylist.success'),
                    });
                    onSuccess(data);
                    onCancel();
                },
            },
        );
    });

    const isPublicDisplayed = hasFeature(server, ServerFeature.PUBLIC_PLAYLIST);
    const isSubmitDisabled = !form.values.name || mutation.isPending;

    return (
        <form onSubmit={handleSubmit}>
            <Stack>
                <TextInput
                    data-autofocus
                    label={t('form.createPlaylist.input', {
                        context: 'name',
                    })}
                    required
                    {...form.getInputProps('name')}
                />
                {server?.type === ServerType.NAVIDROME && (
                    <TextInput
                        label={t('form.createPlaylist.input', {
                            context: 'description',
                        })}
                        {...form.getInputProps('comment')}
                    />
                )}
                {isPublicDisplayed && (
                    <Switch
                        label={t('form.createPlaylist.input', {
                            context: 'public',
                        })}
                        {...form.getInputProps('public', { type: 'checkbox' })}
                    />
                )}
                <Group justify="flex-end">
                    <ModalButton onClick={onCancel}>{t('common.cancel')}</ModalButton>
                    <ModalButton
                        disabled={isSubmitDisabled}
                        loading={mutation.isPending}
                        type="submit"
                        variant="filled"
                    >
                        {t('common.save')}
                    </ModalButton>
                </Group>
            </Stack>
        </form>
    );
};
