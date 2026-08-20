import { LogLevel, LogSeverity } from './types';

export type { LogLevel, LogSeverity };

export interface ConsoleLoggerOptions {
    /** Returns the host's electron-log bridge, if one exists (desktop renderer). */
    getElectronLog?: () => ElectronLogApi | null;
    /** Forwards log-level changes to a host process (e.g. desktop IPC). */
    onLogLevelChange?: (level: LogLevel) => void;
}

export interface ElectronLogApi {
    debug: (...params: any[]) => void;
    error: (...params: any[]) => void;
    info: (...params: any[]) => void;
    sendToMain?: (message: {
        data: any[];
        level: LogSeverity;
        variables?: { processType: string };
    }) => void;
    warn: (...params: any[]) => void;
}

export interface Logger {
    debug: LogFn;
    error: LogFn;
    info: LogFn;
    updateLogLevel: (level: LogLevel) => void;
    warn: LogFn;
}

interface LogFn {
    (message?: string, meta?: any): void;
}

const DEFAULT_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const PROCESS_WIDTH = 10;
const LEVEL_WIDTH = 5;
const RESET = '\x1B[0m';

const levelColors: Record<LogSeverity, string> = {
    debug: '\x1B[38;2;100;149;237m', // #6495ED
    error: '\x1B[38;2;255;100;100m', // #ff6464
    info: '\x1B[38;2;76;175;80m', // #4caf50
    warn: '\x1B[38;2;225;125;50m', // #e17d32
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NO_OP: LogFn = (_message?: string, ..._optionalParams: any[]) => {};

export const normalizeLogLevel = (value: null | string | undefined): LogLevel => {
    if (value === 'debug' || value === 'info') {
        return value;
    }

    // Legacy warn/error/trace thresholds map to nearby levels.
    if (value === 'warn' || value === 'error') {
        return 'info';
    }

    if (value === 'trace') {
        return 'debug';
    }

    return DEFAULT_LOG_LEVEL;
};

// Debounce configuration
const DEBOUNCE_INTERVAL = 200; // milliseconds

// Web-context logger: persists the level via localStorage. Both instantiation sites (desktop renderer, remote PWA) are browser contexts; main uses electron-log instead.
class ConsoleLogger implements Logger {
    debug: LogFn = NO_OP;
    error: LogFn = NO_OP;
    info: LogFn = NO_OP;
    updateLogLevel: (level: LogLevel) => void;
    warn: LogFn = NO_OP;

    private readonly debounceMap = new Map<string, { count: number; lastLog: number }>();
    private readonly getElectronLog?: () => ElectronLogApi | null;
    private readonly label: string;
    private readonly onLogLevelChange?: (level: LogLevel) => void;

    constructor(label: string, options: ConsoleLoggerOptions = {}) {
        this.label = label;
        this.getElectronLog = options.getElectronLog;
        this.onLogLevelChange = options.onLogLevelChange;

        const level = normalizeLogLevel(localStorage.getItem('log_level'));
        if (localStorage.getItem('log_level') !== level) {
            localStorage.setItem('log_level', level);
        }

        this.initializeLoggers(level);
        this.onLogLevelChange?.(level);

        this.updateLogLevel = (newLevel: LogLevel) => {
            this.initializeLoggers(newLevel);
            this.onLogLevelChange?.(newLevel);
        };

        // Periodically flush the debounce map.
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.debounceMap.entries()) {
                if (now - value.lastLog >= DEBOUNCE_INTERVAL) {
                    const [level, message, meta] = JSON.parse(key) as [LogSeverity, string, any];
                    const messageStr = message ? String(message) : '';

                    if (meta !== undefined && meta !== null) {
                        console.log(this.formatLogLine(level, messageStr, value.count), meta);
                    } else {
                        console.log(this.formatLogLine(level, messageStr, value.count));
                    }

                    this.forwardToElectronLog(level, messageStr, meta, value.count);

                    this.debounceMap.delete(key);
                }
            }
        }, DEBOUNCE_INTERVAL);
    }

    private formatLogLine(level: LogSeverity, message: string, count = 1): string {
        const countStr = count > 1 ? ` (x${count})` : '';
        const levelLabel = `${levelColors[level]}${level.toUpperCase().padEnd(LEVEL_WIDTH, ' ')}${RESET}`;
        const processLabel = this.label.padEnd(PROCESS_WIDTH, ' ');
        return `${new Date().toISOString()} ${levelLabel} ${processLabel} ${message}${countStr}`;
    }

    private forwardToElectronLog(level: LogSeverity, message: string, meta?: any, count = 1) {
        const electronLog = this.getElectronLog?.() ?? null;
        if (!electronLog) {
            return;
        }

        const countStr = count > 1 ? ` (x${count})` : '';
        const forwardMessage = `${message}${countStr}`;
        const data = meta !== undefined ? [forwardMessage, meta] : [forwardMessage];

        if (typeof electronLog.sendToMain === 'function') {
            electronLog.sendToMain({
                data,
                level,
                // Main matches the bare name (e.g. 'renderer'), not the bracketed label.
                variables: { processType: this.label.replace(/^\[|\]$/, '') },
            });
            return;
        }

        if (meta !== undefined) {
            electronLog[level](forwardMessage, meta);
        } else {
            electronLog[level](forwardMessage);
        }
    }

    private initializeLoggers(level: LogLevel) {
        const withDebounce = (logLevel: LogSeverity): LogFn => {
            return (message?: any, meta?: any) => {
                const key = JSON.stringify([logLevel, message, meta]);
                const now = Date.now();
                const existing = this.debounceMap.get(key);

                if (existing) {
                    existing.count++;
                    existing.lastLog = now;
                } else {
                    this.debounceMap.set(key, { count: 1, lastLog: now });
                }
            };
        };

        this.error = withDebounce('error');
        this.warn = withDebounce('warn');
        this.info = withDebounce('info');
        this.debug = level === 'debug' ? withDebounce('debug') : NO_OP;
    }
}

export { ConsoleLogger };
