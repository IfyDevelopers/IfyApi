// Import all functionality from modules
import {
  stopBot,
  startBot,
  restartBot,
  startAllBots,
  stopAllBots,
  shutdown,
  createBotInstance,
  getSupportedPlatforms,
  platformList as Platform
} from './setup.js';

// Import modules
import * as button from './button.js';
import * as command from './command.js';
import * as message from './message.js';

// Re-export all functionality
export {
  // Setup functions
  stopBot,
  startBot,
  restartBot,
  startAllBots,
  stopAllBots,
  shutdown,
  createBotInstance,
  getSupportedPlatforms,
  
  // Modules
  button,
  command,
  message,
  
  // Helpers
  command as commandModule,
  message as messageModule,
  button as buttonModule
};

export type { Platform };

// Export types from modules
export type {
  // From button.js
  Button,
  ButtonStyle,
  ButtonAction,
  Page,
  ButtonBuilder,
  PageBuilder,
  PlatformExecutor,
  // From command.js
  Command,
  CommandRegistry,
  // From message.js
  MessageOptions,
  MessageResult,
  SendMessageOptions,
  DeleteMessageOptions
} from './types.js';

// Default export with all functionality
const IfyApi = {
  // Setup functions
  stopBot,
  startBot,
  restartBot,
  startAllBots,
  stopAllBots,
  shutdown,
  createBotInstance,
  getSupportedPlatforms,
  
  // Modules
  button,
  command,
  message,
  
  // Aliases for modules
  commands: command,
  messages: message,
  buttons: button,
  
  // Helpers
  showHelp: command.showHelp
};

export default IfyApi;