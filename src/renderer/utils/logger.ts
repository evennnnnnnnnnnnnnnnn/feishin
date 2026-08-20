import { ConsoleLogger, type ElectronLogApi } from '@feishin/core/logger/console-logger';

export { normalizeLogLevel } from '@feishin/core/logger/console-logger';
export type { LogLevel, LogSeverity } from '@feishin/core/logger/types';

const getElectronLog = () =>
    (window as Window & { __electronLog?: ElectronLogApi }).__electronLog ?? null;

export const logger = new ConsoleLogger('[renderer]', {
    getElectronLog,
    onLogLevelChange: (level) => {
        if (!window.api?.ipc) {
            return;
        }

        window.api.ipc.send('logger-set-level', level);
    },
});
