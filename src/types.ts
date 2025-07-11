// Core types for the IfyApi framework

// Button types
export interface ButtonStyle {
  primary?: boolean;
  secondary?: boolean;
  success?: boolean;
  danger?: boolean;
  link?: boolean;
}

export interface ButtonAction {
  type: 'url' | 'callback' | 'command';
  value: string;
}

export interface Button {
  text: string;
  action: ButtonAction;
  style?: ButtonStyle;
  platforms?: string[];
}

export interface Page {
  id: string;
  content: string;
  buttons: Button[][];
  onShow?: () => void;
  onHide?: () => void;
}

// Command types
export interface Command {
  name: string;
  description: string;
  showInHelp: boolean;
  showInList: boolean;
  aliases: string[];
  execute: (platform: string, context: any) => Promise<void> | void;
}

export interface CommandRegistry {
  register(command: Command): void;
  getCommand(name: string): Command | undefined;
  getAllCommands(): Command[];
  getVisibleCommands(): Command[];
}

// Message types
export interface MessageOptions {
  text: string;
  platform: string | string[];
  replyToMessageId?: string | number;
  reply?: boolean | number | string;
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  allowSendingWithoutReply?: boolean;
  privateMessage?: boolean | number;
  platformSpecific?: {
    [key: string]: any;
  };
  onSuccess?: (result: MessageResult) => void;
  onError?: (error: Error) => void;
}

export interface MessageResult {
  success: boolean;
  messageId?: string | number;
  platform: string;
  error?: Error;
}

export interface SendMessageOptions extends Omit<MessageOptions, 'platform'> {
  platform?: string | string[];
}

export interface DeleteMessageOptions {
  messageId: string | number;
  platform: string;
  logError?: boolean;
}

// Button builder types
export interface ButtonBuilder {
  setText(text: string): ButtonBuilder;
  setAction(type: 'url' | 'callback' | 'command', value: string): ButtonBuilder;
  setStyle(style: ButtonStyle): ButtonBuilder;
  setPlatforms(platforms: string[]): ButtonBuilder;
  build(): Button;
}

// Page builder types
export interface PageBuilder {
  setId(id: string): PageBuilder;
  setContent(content: string): PageBuilder;
  addButton(button: Button, row?: number): PageBuilder;
  setOnShow(callback: () => void): PageBuilder;
  setOnHide(callback: () => void): PageBuilder;
  build(): Page;
}

// Platform executor types
export interface PlatformExecutor {
  execute(platform: string, button: Button, context: any): Promise<void>;
  showPage(platform: string, page: Page, context: any): Promise<void>;
}
