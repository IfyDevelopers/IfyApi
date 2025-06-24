import { mkdir, writeFile, access, constants } from 'fs/promises';
import { join, dirname } from 'path';
import { configManager } from './configManager.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

class Logger {
    private static instance: Logger;
    private logsDir: string;
    private logsEnabled = true;
    private logLevel: LogLevel = 'info';
    private debugMode = false;

    private constructor() {
        this.logsDir = join(process.cwd(), 'IA', 'logs');
        this.loadConfig();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private loadConfig(): void {
        const config = configManager.getConfig();
        this.logLevel = config.logLevel;
        this.debugMode = config.debug;
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.logsEnabled) return false;
        return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
    }

    private getTimestamp(): string {
        return new Date().toISOString();
    }

    private async writeToFile(platform: string, message: string): Promise<void> {
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const platformDir = join(this.logsDir, platform);
            
            try {
                await mkdir(platformDir, { recursive: true });
            } catch (error) {
                console.error(`Failed to create log directory for ${platform}:`, error);
                return;
            }
            
            const logFilePath = join(platformDir, `${dateStr}.log`);
            const logMessage = `[${this.getTimestamp()}] ${message}\n`;
            
            await writeFile(logFilePath, logMessage, { flag: 'a' });
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    public async log(level: LogLevel, platform: string, message: string, ...args: any[]): Promise<void> {
        if (!this.shouldLog(level)) return;
        
        const formattedMessage = `[${platform.toUpperCase()}] [${level.toUpperCase()}] ${message}`;
        const logMessage = args.length > 0 
            ? `${formattedMessage} ${args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, this.debugMode ? 2 : 0) : String(arg)
            ).join(' ')}`
            : formattedMessage;
        
        switch (level) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            case 'info':
                console.info(logMessage);
                break;
            case 'debug':
                if (this.debugMode) {
                    console.debug(logMessage);
                }
                break;
        }

        if (level === 'error' || level === 'warn') {
            await this.writeToFile(platform, logMessage);
        }
    }

    public async error(platform: string, error: Error | unknown, context?: Record<string, any>): Promise<void> {
        const errorObj = error instanceof Error 
            ? { message: error.message, stack: error.stack }
            : { message: String(error) };
            
        const errorMessage = context 
            ? `ERROR: ${errorObj.message}\nContext: ${JSON.stringify(context, null, this.debugMode ? 2 : 0)}\n${errorObj.stack || ''}`
            : `ERROR: ${errorObj.message}\n${errorObj.stack || ''}`;
            
        await this.log('error', platform, errorMessage);
    }

    public async warn(platform: string, message: string, ...args: any[]): Promise<void> {
        await this.log('warn', platform, message, ...args);
    }

    public async info(platform: string, message: string, ...args: any[]): Promise<void> {
        await this.log('info', platform, message, ...args);
    }

    public async debug(platform: string, message: string, ...args: any[]): Promise<void> {
        if (this.debugMode) {
            await this.log('debug', platform, message, ...args);
        }
    }
}

export const logger = Logger.getInstance();

export async function logError(platform: string, error: Error | unknown): Promise<void> {
    await logger.error(platform, error);
}
