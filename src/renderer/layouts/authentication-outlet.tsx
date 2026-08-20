import { AuthState } from '@feishin/core/types/types';
import { Center } from '@feishin/ui/components/center/center';
import { Spinner } from '@feishin/ui/components/spinner/spinner';
import { Outlet } from 'react-router';

import { useServerAuthenticated } from '/@/renderer/hooks/use-server-authenticated';

export const AuthenticationOutlet = () => {
    const authState = useServerAuthenticated();

    if (authState === AuthState.LOADING) {
        return (
            <Center h="100vh" w="100%">
                <Spinner container />
            </Center>
        );
    }

    return <Outlet />;
};
