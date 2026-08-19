import { AuthState } from '@feishin/core/types/types';
import { Outlet } from 'react-router';

import { useServerAuthenticated } from '/@/renderer/hooks/use-server-authenticated';
import { Center } from '/@/shared/components/center/center';
import { Spinner } from '/@/shared/components/spinner/spinner';

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
