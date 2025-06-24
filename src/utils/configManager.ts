import { readFile, writeFile, mkdir, access, constants } from 'fs/promises';
import { execSync } from 'child_process';
import { join, dirname } from 'path';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type DatabaseType = 'sqlite' | 'postgres' | 'mongodb';

const DEFAULT_CONFIG = {
    debug: false,
    logLevel: 'info' as LogLevel,
    autoUpdate: false,
    bot: {
        owners: [] as string[],
        defaultLanguage: 'en',
    },
    platforms: {
        discord: {
            enabled: true,
            token: '',
            intents: ['Guilds', 'GuildMessages', 'MessageContent']
        },
        telegram: {
            enabled: true,
            token: '',
            parseMode: 'HTML',
        },
    },
    database: {
        type: 'sqlite' as DatabaseType,
        database: 'database.sqlite',
        host: 'localhost',
        port: 5432,
        username: '',
        password: '',
        synchronize: true,
        logging: false,
    },
    api: {
        enabled: true,
        port: 3000,
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    },
};

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type Config = typeof DEFAULT_CONFIG;

class ConfigManager {
    private static instance: ConfigManager;
    private configPath: string;
    private config: Config;

    private constructor() {
        this.configPath = join(process.cwd(), 'IA', 'config.json');
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private sanitizeConfig(userCfg: any, reference: any): any {
        const output: any = Array.isArray(reference) ? [] : {};
        for (const key of Object.keys(reference)) {
            if (userCfg && Object.prototype.hasOwnProperty.call(userCfg, key)) {
                if (this.isObject(reference[key])) {
                    output[key] = this.sanitizeConfig(userCfg[key], reference[key]);
                } else {
                    output[key] = userCfg[key];
                }
            } else {
                output[key] = reference[key];
            }
        }
        return output;
    }

    private deepMerge(target: any, source: any): any {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
                    output[key] = [...new Set([...target[key], ...source[key]])];
                } else if (source[key] !== undefined) {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    }

    private isObject(item: any): item is Record<string, any> {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    private stripJsonComments(data: string): string {
        return data.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
    }

    private generateTemplate(): string {
        return `{
  // Enable verbose debug output (true | false)
  "debug": false,
  // Automatically install the latest ifyapi from npm on startup (true | false)
  "autoUpdate": false,
  // Global log level: "error" | "warn" | "info" | "debug"
  "logLevel": "info",
  // General bot options
  "bot": {
    // List of owner IDs
    "owners": [],
    // Default language code
    "defaultLanguage": "en"
  },
  "platforms": {
    "discord": {
      // Turn Discord bot on/off
      "enabled": true,
      // Discord bot token
      "token": "",
      // Gateway intents to request
      "intents": ["Guilds", "GuildMessages", "MessageContent"]
    },
    "telegram": {
      // Turn Telegram bot on/off
      "enabled": true,
      // Telegram bot token
      "token": "",
      // Parse mode for messages (MarkdownV2 | HTML)
      "parseMode": "HTML"
    }
  },
  "database": {
    // Type: "sqlite" | "postgres" | "mongodb"
    "type": "sqlite",
    "database": "database.sqlite",
    "host": "localhost",
    "port": 5432,
    "username": "",
    "password": "",
    // Auto-create tables?
    "synchronize": true,
    "logging": false
  },
  "api": {
    "enabled": true,
    "port": 3000,
    "cors": {
      "origin": "*",
      "methods": ["GET", "POST"]
    }
  }
}`;
    }

    private async autoUpdateLibrary(): Promise<void> {
        try {
            execSync('npm install ifyapi@latest', { stdio: 'inherit' });
        } catch {
            // ignore failures to update
        }
    }

    public async loadConfig(): Promise<Config> {
        try {
            try {
                await access(this.configPath, constants.F_OK);
                const configData = await readFile(this.configPath, 'utf-8');
                const userConfig = JSON.parse(this.stripJsonComments(configData));
                const merged = this.deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), userConfig);
                this.config = this.sanitizeConfig(merged, DEFAULT_CONFIG);
                if (this.config.autoUpdate) {
                    await this.autoUpdateLibrary();
                }
                return this.config;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                    await mkdir(dirname(this.configPath), { recursive: true });
                    await writeFile(this.configPath, this.generateTemplate(), 'utf-8');
                    if (this.config.autoUpdate) {
                        await this.autoUpdateLibrary();
                    }
                    return this.config;
                }
                throw error;
            }
        } catch (error) {
            console.error('Error loading config:', error);
            return this.config;
        }
    }

    public async saveConfig(): Promise<void> {
        try {
            await mkdir(dirname(this.configPath), { recursive: true });
            await writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
        } catch {
            
        }
    }

    public getConfig(): Config {
        return this.config;
    }

    public async updateConfig(updates: DeepPartial<Config>): Promise<Config> {
        this.config = this.deepMerge(this.config, updates);
        await this.saveConfig();
        return this.config;
    }
}

export const configManager = ConfigManager.getInstance();

export async function initializeConfig(): Promise<Config> {
    return configManager.loadConfig();
}

export type { Config, LogLevel, DatabaseType };
