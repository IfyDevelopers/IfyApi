import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { Telegraf, session } from 'telegraf';
import dotenv from 'dotenv';
import { join } from 'path';
import { configManager, initializeConfig } from './utils/configManager.js';
import { logger } from './utils/logger.js';

dotenv.config();

type Platform = 'discord' | 'telegram';
export type platformList = Platform;

let config: ReturnType<typeof configManager.getConfig> | null = null;

async function getConfig() {
    if (!config) {
        await initializeConfig();
        config = configManager.getConfig();
    }
    return config;
}

async function getSupportedPlatforms(): Promise<Platform[]> {
    const cfg = await getConfig();
    return Object.entries(cfg.platforms)
        .filter(([_, settings]) => settings.enabled)
        .map(([platform]) => platform as Platform);
}

interface BotInstance {
    platform: string;
    start: () => Promise<void>;
    stop: () => Promise<void>;
}

class DiscordBot implements BotInstance {
    public platform = 'discord';
    private client: Client;

    constructor() {

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
            partials: [Partials.Channel],
        });

        this.client.once('ready', () => {
            logger.info('discord', `Logged in as ${this.client.user?.tag}`);
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            const prefix = '/';
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const command = args.shift()?.toLowerCase();

            if (command === 'ping') {
                await message.reply('Pong!');
            }
        });

        this.client.on('error', (error) => {
            logger.error('discord', error);
        });
    }

    async start(): Promise<void> {
        try {
            await this.client.login(process.env.DISCORD_TOKEN);
            logger.info('discord', 'Bot started successfully');
        } catch (error) {
            logger.error('discord', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        try {
            this.client.destroy();
            logger.info('discord', 'Bot stopped');
        } catch (error) {
            logger.error('discord', error);
            throw error;
        }
    }
}

class TelegramBot implements BotInstance {
    public platform = 'telegram';
    private bot: Telegraf;

    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_TOKEN || '');

        this.bot.use(session());

        this.bot.command('start', (ctx) => {
            ctx.reply('Hello! I am your bot.');
        });

        this.bot.on('text', (ctx) => {
            const prefix = '/';
            const text = ctx.message.text;

            if (!text.startsWith(prefix)) return;

            const args = text.slice(prefix.length).trim().split(/ +/);
            const command = args.shift()?.toLowerCase();

            if (command === 'ping') {
                ctx.reply('Pong!');
            }
        });

        this.bot.catch((error) => {
            logger.error('telegram', error);
        });
    }

    async start(): Promise<void> {
        try {
            await this.bot.launch();
            logger.info('telegram', 'Bot started successfully');
        } catch (error) {
            logger.error('telegram', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        try {
            await this.bot.stop();
            logger.info('telegram', 'Bot stopped');
        } catch (error) {
            logger.error('telegram', error);
            throw error;
        }
    }
}

const botInstances: Record<string, BotInstance> = {};
const runningBots = new Set<Platform>();

export async function createBotInstance(platform: Platform): Promise<BotInstance> {
    await getConfig(); // Ensure config is loaded
    switch (platform) {
        case 'discord':
            return new DiscordBot();
        case 'telegram':
            return new TelegramBot();
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

export async function startBot(...platforms: Platform[]): Promise<string[]> {
    const results: string[] = [];
    const supportedPlatforms = await getSupportedPlatforms();
    
    for (const plat of platforms) {
        if (!supportedPlatforms.includes(plat)) {
            const error = `Platform '${plat}' is not supported`;
            logger.error(plat, error);
            results.push(error);
            continue;
        }

        if (runningBots.has(plat)) {
            results.push(`Bot for ${plat} is already running`);
            continue;
        }

        try {
            const bot = await createBotInstance(plat);
            await bot.start();
            botInstances[plat] = bot;
            runningBots.add(plat);
            const successMsg = `${plat} bot started successfully`;
            logger.info(plat, successMsg);
            results.push(successMsg);
        } catch (error) {
            const errorMsg = `Failed to start ${plat} bot: ${error instanceof Error ? error.message : String(error)}`;
            logger.error(plat, errorMsg);
            results.push(errorMsg);
        }
    }
    
    return results;
}

export async function stopBot(...platforms: Platform[]): Promise<string[]> {
    const results: string[] = [];

    for (const plat of platforms) {
        if (!runningBots.has(plat)) {
            results.push(`No running bot found for ${plat}`);
            continue;
        }

        try {
            const bot = botInstances[plat];
            if (bot) {
                await bot.stop();
                delete botInstances[plat];
                runningBots.delete(plat);
                const successMsg = `${plat} bot stopped successfully`;
                logger.info(plat, successMsg);
                results.push(successMsg);
            } else {
                const errorMsg = `Bot instance not found for ${plat}`;
                logger.error(plat, errorMsg);
                results.push(errorMsg);
            }
        } catch (error) {
            const errorMsg = `Failed to stop ${plat} bot: ${error instanceof Error ? error.message : String(error)}`;
            logger.error(plat, errorMsg);
            results.push(errorMsg);
        }
    }

    return results;
}

export async function restartBot(...platforms: Platform[]): Promise<string[]> {
    await stopBot(...platforms);
    return startBot(...platforms);
}

export async function startAllBots(): Promise<string[]> {
    const supportedPlatforms = await getSupportedPlatforms();
    return startBot(...supportedPlatforms);
}

export async function stopAllBots(): Promise<void> {
    const platforms = Object.keys(botInstances) as Platform[];
    if (platforms.length > 0) {
        await stopBot(...platforms);
    }
}

process.on('SIGINT', async () => {
    logger.info('system', 'Shutting down...');
    await stopAllBots();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('system', 'Shutting down...');
    await stopAllBots();
    process.exit(0);
});

export { getSupportedPlatforms };

export async function shutdown(): Promise<string[]> {
    const platforms = Array.from(runningBots) as Platform[];
    if (platforms.length === 0) {
        return ['No running bots to shut down'];
    }
    
    return stopBot(...platforms);
}