import { Platform } from './button.js';

// Command interface
export interface Command {
  name: string;
  description: string;
  showInHelp: boolean;
  showInList: boolean;
  aliases: string[];
  execute: (platform: Platform, context: any) => Promise<void> | void;
}

// Command registry
class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, Command> = new Map();

  private constructor() {}

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  register(command: Command): void {
    // Register main command
    this.commands.set(command.name.toLowerCase(), command);
    
    // Register aliases
    command.aliases.forEach(alias => {
      this.commands.set(alias.toLowerCase(), command);
    });
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name.toLowerCase());
  }

  getAllCommands(): Command[] {
    return Array.from(new Set(this.commands.values()));
  }

  getVisibleCommands(): Command[] {
    return this.getAllCommands().filter(cmd => cmd.showInList);
  }
}

// Command decorator
export function createCommand(
  name: string,
  description: string,
  showInHelp: boolean | number | string = true,
  showInList: boolean | number | string = true,
  aliases: string[] = []
): MethodDecorator {
  return function(target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    // Convert to boolean if number or string
    const showInHelpBool = typeof showInHelp === 'boolean' ? showInHelp : Boolean(Number(showInHelp));
    const showInListBool = typeof showInList === 'boolean' ? showInList : Boolean(Number(showInList));
    
    const command: Command = {
      name,
      description,
      showInHelp: showInHelpBool,
      showInList: showInListBool,
      aliases,
      execute: originalMethod
    };
    
    CommandRegistry.getInstance().register(command);
    
    return descriptor;
  };
}

// Helper to get command registry
export function getCommandRegistry(): CommandRegistry {
  return CommandRegistry.getInstance();
}

/**
 * Displays available commands in a formatted list
 * @param options Configuration options for the help display
 * @param options.limit Number of commands to show per page (default: show all)
 * @param options.offset Number of commands to skip before starting to show (default: 0)
 * @returns Formatted string with command list
 */
export function showHelp(options: { limit?: number; offset?: number } = {}): string {
  const { limit, offset = 0 } = options;
  const registry = getCommandRegistry();
  
  // Get visible commands and filter out those hidden from help
  const commands = registry.getVisibleCommands()
    .filter(cmd => cmd.showInHelp)
    .filter((cmd, index, array) => {
      // Filter to keep only one instance of each command (remove duplicates from aliases)
      return array.findIndex(c => c.name === cmd.name) === index;
    });

  // Apply pagination if specified
  const paginatedCommands = limit !== undefined 
    ? commands.slice(offset, offset + limit)
    : commands.slice(offset);

  if (paginatedCommands.length === 0) {
    return 'No commands available.';
  }

  // Format each command as "name: description"
  const commandList = paginatedCommands
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(cmd => `• ${cmd.name}: ${cmd.description}`)
    .join('\n');

  // Add pagination info if needed
  let paginationInfo = '';
  if (limit !== undefined) {
    const totalPages = Math.ceil(commands.length / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    paginationInfo = `\n\nPage ${currentPage} of ${totalPages} (${commands.length} total commands)`;
  } else if (offset > 0) {
    paginationInfo = `\n\nShowing commands ${offset + 1} to ${Math.min(offset + paginatedCommands.length, commands.length)} of ${commands.length} total`;
  }

  return `Available commands:\n${commandList}${paginationInfo}`;
}
