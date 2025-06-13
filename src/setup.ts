import { Client, GatewayIntentBits } from 'discord.js';
import { Telegraf } from 'telegraf';
import dotenv from "dotenv";
dotenv.config();

const runningBots = new Map<platformList, any>();
export type platformList = 'telegram' | 'discord';
const SUPPORTED_PLATFORMS: platformList[] = ['telegram', 'discord'];


export async function startBot(...platforms: platformList[]): Promise<string[]> {
    const launch: Promise<string>[] = [];
    if (platforms.length === 0) {
        return [`Error: No platforms specified in .env file.`];
    }
    for (const platform of platforms) {
        if (runningBots.has(platform)) {
            launch.push(Promise.resolve(`Bot for ${platform} is already running.`));
            continue;
        };
        launch.push(
            (async () => {
            const token = process.env[`${platform.toUpperCase()}_TOKEN`];
            if (!token) {
                return `Error: Missing ${platform.toUpperCase()}_TOKEN in .env file. Cannot start ${platform} bot.`;
            }
            try {
                switch (platform) {
                    case `telegram`:
                        const teleBot = new Telegraf(token);
                        teleBot.hears('hi', (ctx) => ctx.reply('Hey there from Telegram!'));

                        console.log(`Telegram bot started successfully.`);
                        runningBots.set(platform, teleBot);
                        await teleBot.launch();
                        return `Telegram bot started successfully.`;

                    case `discord`:
                        const discBot = new Client({
                            intents: [
                                GatewayIntentBits.Guilds,
                                GatewayIntentBits.GuildMessages,
                                GatewayIntentBits.MessageContent
                            ]
                        });
                        discBot.on(`ready`, () => {
                            console.log(`Logged in as ${discBot.user?.tag}!`);
                        });
                        discBot.on('messageCreate', message => {
                            if (message.author?.bot) return;
                            if (message.content === '!ping') {
                                message.reply('Pong!');
                            }
                        });
                        await discBot.login(token);
                        runningBots.set(platform, discBot);
                        console.log(`Discord bot started successfully.`);
                        return `Discord bot started successfully.`;
                    default:
                        return `Error: Unsupported platform ${platform}.`;
                }
            } catch (error) {
                console.error(`Error starting ${platform} bot:`, error);
                return `Error starting ${platform} bot: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        })());
    }

    const results = await Promise.allSettled(launch);
    return results.map(result => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            return `Failed to start: ${(result.reason as Error)?.message || 'Unknown reason'}`;
        }
    });
}


export function stopBot(platform: platformList): string {
    if (runningBots.has(platform)) {
        const Instance = runningBots.get(platform);
        if (platform === `telegram`) {
            Instance.stop(`manual stop`);
            runningBots.delete(platform);
            return `Telegram bot stopped`;
        }  else if (platform === `discord`) {
            Instance.destroy();
            runningBots.delete(platform);
            return `Discord bot stopped`;
        }
        return `Error: Unsupported platform ${platform}.`;
    }
    return `Error: No bot is running for ${platform}.`;
}


export async function restartBot(...platforms: platformList[]): Promise<string[]> {
    const results: string[] = [];
    if (platforms.length === 0) {
        results.push("No platforms specified for restart.");
        return results;
    }
    const platformsToRestart = platforms.filter(p => SUPPORTED_PLATFORMS.includes(p));
    const unsupportedPlatforms = platforms.filter(p => !SUPPORTED_PLATFORMS.includes(p));

    unsupportedPlatforms.forEach(p => {
        results.push(`Skipping restart for unsupported platform: '${p}'.`);
    });
    if (platformsToRestart.length === 0) {
        results.push("No supported platforms found for restart.");
        return results;
    }
    results.push(`Attempting to stop bots: ${platformsToRestart.join(', ')}`);
    const stopResults = platformsToRestart.map(p => stopBot(p)); 
    results.push(...stopResults);
    await new Promise(resolve => setTimeout(resolve, 500));
    results.push(`Attempting to start bots: ${platformsToRestart.join(', ')}`);
    const startResults = await startBot(...platformsToRestart);
    results.push(...startResults);
    return results;
}

export function shutdown(): string[] {
    const results: string[] = [];
    for (const platform of runningBots.keys()) {
        results.push(stopBot(platform));
    }
    return results;
}