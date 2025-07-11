// Core types and interfaces for the cross-platform bot

// Import platforms from config
import config from '../config.json' with { type: 'json' };

// Define Platform type based on config
export type Platform = (typeof config.platforms)[number];

// Export platforms array
export const platforms: readonly Platform[] = [...config.platforms];

// Ensure no platforms are added elsewhere
Object.freeze(platforms);


export interface ButtonStyle {
  primary?: boolean;
  secondary?: boolean;
  danger?: boolean;
  className?: string;
  platformStyles?: Partial<Record<Platform, object>>;
}

export interface Button {
  text: string;
  platforms: Platform[];
  action: () => void | Promise<void>;
  style?: ButtonStyle;
  nextPage?: string;
  command?: string;
}

export interface Page {
  name: string;
  content: string;
  buttons: Button[];
  onEnter?: (platform: Platform, context: any) => void | Promise<void>;
  onLeave?: (platform: Platform, context: any) => void | Promise<void>;
}

export class ButtonBuilder {
  private button: Partial<Button> = {
    platforms: [],
    style: {}
  };

  constructor(text: string, ...platforms: Platform[]) {
    this.button.text = text;
    this.button.platforms = platforms.length > 0 ? platforms : ['telegram', 'discord'];
  }

  action(callback: () => void | Promise<void>): this {
    this.button.action = callback;
    return this;
  }

  style(style: Button['style']): this {
    this.button.style = { ...this.button.style, ...style };
    return this;
  }

  primary(): this {
    this.button.style = { ...this.button.style, primary: true };
    return this;
  }

  secondary(): this {
    this.button.style = { ...this.button.style, secondary: true };
    return this;
  }

  danger(): this {
    this.button.style = { ...this.button.style, danger: true };
    return this;
  }

  to(pageName: string): this {
    this.button.nextPage = pageName;
    return this;
  }

  command(cmd: string): this {
    this.button.command = cmd;
    return this;
  }

  build(): Button {
    if (!this.button.action && !this.button.nextPage && !this.button.command) {
      throw new Error('Button must have either an action, nextPage, or command');
    }
    return this.button as Button;
  }
}

export class PageBuilder {
  private page: Partial<Page> = { buttons: [] };
  private static pages: Map<string, Page> = new Map();

  constructor(name: string) {
    this.page.name = name;
  }

  content(text: string): this {
    this.page.content = text;
    return this;
  }

  addButton(button: Button): this {
    if (!this.page.buttons) this.page.buttons = [];
    this.page.buttons.push(button);
    return this;
  }

  onEnter(callback: Page['onEnter']): this {
    this.page.onEnter = callback;
    return this;
  }

  onLeave(callback: Page['onLeave']): this {
    this.page.onLeave = callback;
    return this;
  }

  build(): Page {
    if (!this.page.name) throw new Error('Page must have a name');
    const page = this.page as Page;
    PageBuilder.pages.set(page.name, page);
    return page;
  }

  static getPage(name: string): Page | undefined {
    return this.pages.get(name);
  }
}

// Helper functions
export function create(text: string, ...platforms: Platform[]): ButtonBuilder {
  return new ButtonBuilder(text, ...platforms);
}

export const page = {
  create: (name: string): PageBuilder => new PageBuilder(name),
  get: (name: string): Page | undefined => PageBuilder.getPage(name)
};

// Platform-specific execution
export class PlatformExecutor {
  static async execute(platform: Platform, button: Button, context: any = {}): Promise<void> {
    // Execute button action if it exists
    if (button.action) {
      await button.action();
    }

    // Handle page navigation
    if (button.nextPage) {
      const page = PageBuilder.getPage(button.nextPage);
      if (page) {
        await this.showPage(platform, page, context);
      }
    }

    // Handle command execution
    if (button.command) {
      console.log(`[${platform}] Executing command: ${button.command}`);
    }
  }

  private static async showPage(platform: Platform, page: Page, context: any): Promise<void> {
    // Call onEnter if it exists
    if (page.onEnter) {
      await page.onEnter(platform, context);
    }

    // Show page content
    console.log(`[${platform.toUpperCase()}] ${page.content}`);

    // Show buttons for this platform
    const platformButtons = page.buttons.filter(btn => 
      btn.platforms.includes(platform)
    );
    
    platformButtons.forEach((btn, index) => {
      const styles = [
        btn.style?.primary ? 'primary' : '',
        btn.style?.danger ? 'danger' : ''
      ].filter(Boolean).join(' ');
      
      console.log(`${index + 1}. ${btn.text}${styles ? ` (${styles})` : ''}`);
    });
  }
}

// Example usage:
/*
// Create pages
page.create('main')
  .content('Welcome to the main menu!')
  .addButton(
    create('Go to settings', 'telegram')
      .action(() => console.log('Settings clicked'))
      .build()
  )
  .build();

createPage('settings')
  .content('Settings page')
  .addButton(
    createButton('Back to main', 'telegram', 'discord')
      .to('main')
      .build()
  )
  .build();

// Platform-specific example
createPage('profile')
  .content('Your profile')
  .addButton(
    createButton('Edit', 'telegram')
      .action(() => {
        // This will only run on Telegram
        console.log('Telegram edit button clicked');
      })
      .build()
  )
  .addButton(
    createButton('Edit', 'discord')
      .action(() => {
        // This will only run on Discord
        console.log('Discord edit button clicked');
      })
      .build()
  )
  .build();
*/
