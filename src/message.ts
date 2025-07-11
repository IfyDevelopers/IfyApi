// Import platforms from config
import config from '../config.json' with { type: 'json' };

// Define Platform type based on config
type Platform = (typeof config.platforms)[number];

// Types for message options
export interface MessageOptions {
  // Basic options
  text: string;
  /**
   * Platform(s) to send the message to
   * Can be a single platform or an array of platforms
   * @example 'telegram'
   * @example ['telegram', 'discord']
   */
  platform: Platform | Platform[];
  
  // Message options
  /**
   * ID of the message to reply to
   * @deprecated Use `reply` with message ID instead
   */
  replyToMessageId?: string | number;
  
  /**
   * Reply configuration
   * - `true` or `1`: Reply to the current message (if context is available)
   * - `false` or `0`: Don't reply
   * - `string | number`: Message ID to reply to
   */
  reply?: boolean | number | string;
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  allowSendingWithoutReply?: boolean;
  
  /**
   * Whether the message should be visible only to the target user
   * - If true/1, the message will be sent as a private message where possible
   * - If not supported, falls back to regular message in the current chat
   * - Default: false
   */
  privateMessage?: boolean | number;
  
  // Platform-specific options (will be used based on the platform)
  platformSpecific?: {
    [key in Platform]?: Record<string, any>;
  };
  
  // Callbacks
  /**
   * Called when a message is successfully sent to a platform
   * @param messageId The ID of the sent message
   * @param platform The platform the message was sent to
   */
  onSuccess?: (messageId: string | number, platform: Platform) => void;
  
  /**
   * Called when an error occurs while sending a message to a platform
   * @param error The error that occurred
   * @param platform The platform where the error occurred
   */
  onError?: (error: Error, platform: Platform) => void;
}

/**
 * Sends a message to the specified platform(s) with the given options.
 * @param options Message options
 * @returns Promise that resolves with an array of sent message IDs, one for each platform
 */
export async function sendMessage(options: MessageOptions): Promise<Array<{ platform: Platform; messageId: string | number }>> {
  const {
    text,
    platform: platforms,
    reply: replyOption,
    replyToMessageId, // Legacy support
    parseMode = 'MarkdownV2',
    disableWebPagePreview = false,
    disableNotification = false,
    allowSendingWithoutReply = true,
    privateMessage = false,
    platformSpecific = {},
    onSuccess,
    onError
  } = options;
  
  // Handle reply option (boolean, number, or message ID)
  let replyToMessageIdFinal: string | number | undefined = undefined;
  
  // Convert reply option to a normalized form
  const shouldReply = (value: any): boolean => {
    if (value === true || value === 1) return true;
    if (typeof value === 'string') {
      return value === '1' || value.toLowerCase() === 'true';
    }
    return false;
  };

  if (replyOption !== undefined && replyOption !== null) {
    if (typeof replyOption === 'string' || typeof replyOption === 'number') {
      // If reply is a message ID (string or number)
      replyToMessageIdFinal = replyOption;
    } else if (shouldReply(replyOption)) {
      // If reply is true/1/'true'/'1', use the legacy replyToMessageId if it exists
      if (replyToMessageId !== undefined) {
        replyToMessageIdFinal = replyToMessageId;
      }
    }
    // For false/0/'false'/'0', we keep replyToMessageIdFinal as undefined
  }

  // Normalize platforms to an array
  const targetPlatforms = Array.isArray(platforms) ? platforms : [platforms];
  const results: Array<{ platform: Platform; messageId: string | number }> = [];

  // Process each platform
  for (const platform of targetPlatforms) {
    try {
      // Get platform-specific options
      const platformOptions = platformSpecific[platform] || {};
      
      // This would be replaced with actual platform-specific implementations
      const messageId = await sendToPlatform(platform, {
        text,
        replyToMessageId: replyToMessageIdFinal,
        parseMode,
        disableWebPagePreview,
        disableNotification,
        allowSendingWithoutReply,
        privateMessage: Boolean(privateMessage === true || privateMessage === 1),
        ...platformOptions
      });

      const result = { platform, messageId };
      results.push(result);
      
      // Call success callback if provided
      onSuccess?.(messageId, platform);
    } catch (error) {
      // Call error callback if provided
      onError?.(error as Error, platform);
      // Continue with other platforms even if one fails
    }
  }

  return results;
}

// Helper function to send message to specific platform
async function sendToPlatform(platform: Platform, options: any): Promise<string | number> {
  // This is a placeholder for actual platform-specific implementations
  // In a real implementation, you would have different logic for each platform
  
  const messageId = Math.random().toString(36).substring(2, 11);
  
  // Handle private message if requested and supported
  const isPrivate = options.privateMessage === true || 
                  options.privateMessage === 1 || 
                  options.privateMessage === '1' || 
                  options.privateMessage === 'true';
  const deliveryMethod = isPrivate ? 'private message' : 'channel message';
  
  // Log the message being sent (for demonstration)
  console.log(`[${platform.toUpperCase()}] Sending ${deliveryMethod}:`, {
    ...options,
    // Don't log the entire text if it's too long
    text: options.text.length > 100 
      ? options.text.substring(0, 100) + '...' 
      : options.text,
    // Remove privateMessage from the log if it's false to reduce noise
    ...(isPrivate ? { privateMessage: true } : {})
  });
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return messageId;
}

/**
 * Deletes a message from the specified platform
 * @param messageId ID of the message to delete
 * @param platform Platform where the message exists
 * @param logError Whether to log errors to console (default: true)
 * @returns Promise that resolves when the message is deleted or rejects with an error
 */
export async function deleteMessage(
  messageId: string | number,
  platform: Platform,
  logError: boolean | number = true
): Promise<void> {
  const shouldLogError = logError === true || logError === 1;
  
  try {
    // This would be replaced with actual platform-specific implementations
    console.log(`[${platform.toUpperCase()}] Deleting message:`, { messageId });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate success
    console.log(`[${platform.toUpperCase()}] Message deleted:`, { messageId });
  } catch (error) {
    const errorMessage = `Failed to delete message ${messageId} from ${platform}: ${error}`;
    
    if (shouldLogError) {
      console.error(`[${platform.toUpperCase()}] ${errorMessage}`);
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Edits an existing message on the specified platform
 * @param messageId ID of the message to edit
 * @param platform Platform where the message exists
 * @param newText New text content for the message
 * @param options Additional options for the edit
 * @param options.parseMode Text formatting mode (MarkdownV2/HTML/Markdown)
 * @param options.disableWebPagePreview Whether to disable link previews
 * @param options.logError Whether to log errors to console (default: true)
 * @returns Promise that resolves when the message is edited or rejects with an error
 */
export async function editMessage(
  messageId: string | number,
  platform: Platform,
  newText: string,
  options: {
    parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
    disableWebPagePreview?: boolean;
    logError?: boolean | number;
  } = {}
): Promise<void> {
  const {
    parseMode = 'MarkdownV2',
    disableWebPagePreview = false,
    logError = true
  } = options;

  try {
    if (!messageId) {
      throw new Error('Message ID is required');
    }

    if (!platform) {
      throw new Error('Platform is required');
    }

    if (!newText) {
      throw new Error('New text content is required');
    }

    // Platform-specific edit logic
    switch (platform) {
      case 'telegram':
        // @ts-ignore - Telegram bot instance should be available
        await global.telegramBot?.editMessageText({
          message_id: messageId,
          text: newText,
          parse_mode: parseMode,
          disable_web_page_preview: disableWebPagePreview
        });
        break;
      case 'discord':
        // @ts-ignore - Discord client instance should be available
        const channel = global.discordClient?.channels.cache.get('CHANNEL_ID');
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(messageId as string);
          await message.edit({
            content: newText,
            allowedMentions: { parse: [] }
          });
        }
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    if (logError) {
      console.error(`[${platform}] Error editing message:`, error);
    }
    throw error;
  }
}

// Helper functions for common message patterns
export const messageUtils = {
  /**
   * Send a reply to a message
   * @param platform Platform or array of platforms to send to
   * @param text Message text
   * @param replyToMessageId ID of the message to reply to
   * @param options Additional message options
   */
  async reply(
    platform: Platform | Platform[], 
    text: string, 
    replyToMessageId: string | number, 
    options: Omit<MessageOptions, 'text' | 'platform' | 'reply' | 'replyToMessageId'> = {}
  ) {
    return sendMessage({
      text,
      platform,
      reply: replyToMessageId, // Using the new reply option
      ...options
    });
  },
  
  /**
   * Send a message with link preview
   * @param platform Platform or array of platforms to send to
   * @param text Message text (can contain links)
   * @param options Additional message options
   */
  async withLinkPreview(
    platform: Platform | Platform[], 
    text: string, 
    options: Omit<MessageOptions, 'text' | 'platform' | 'disableWebPagePreview'> = {}
  ) {
    return sendMessage({
      text,
      platform,
      disableWebPagePreview: false,
      ...options
    });
  },
  
  /**
   * Send a silent message (no notification)
   * @param platform Platform or array of platforms to send to
   * @param text Message text
   * @param options Additional message options
   */
  async silent(
    platform: Platform | Platform[], 
    text: string, 
    options: Omit<MessageOptions, 'text' | 'platform' | 'disableNotification'> = {}
  ) {
    return sendMessage({
      text,
      platform,
      disableNotification: true,
      ...options
    });
  },
  
  /**
   * Send a private message (visible only to the target user)
   * @param platform Platform or array of platforms to send to
   * @param text Message text
   * @param options Additional message options
   */
  async private(
    platform: Platform | Platform[],
    text: string,
    options: Omit<MessageOptions, 'text' | 'platform' | 'privateMessage'> = {}
  ) {
    return sendMessage({
      text,
      platform,
      privateMessage: true,
      ...options
    });
  }
};

// Example usage:
/*
// Basic message
await sendMessage({
  text: 'Hello, world!',
  platform: 'telegram',
  parseMode: 'MarkdownV2'
});

// Reply to a message
await messageUtils.reply(
  'discord', 
  'This is a reply!', 
  '123456789', // message ID to reply to
  { parseMode: 'Markdown' }
);

// Message with link preview
await messageUtils.withLinkPreview(
  'telegram',
  'Check out this link: https://example.com',
  { parseMode: 'HTML' }
);
*/

// Export all types
export type { Platform } from './button.js';
