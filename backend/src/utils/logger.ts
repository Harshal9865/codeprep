type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class Logger {
  private static formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level}] [${context}]: ${message}`;
    if (data !== undefined) {
      try {
        return `${base} | ${JSON.stringify(data)}`;
      } catch {
        return `${base} | [Unserializable data]`;
      }
    }
    return base;
  }

  static info(context: string, message: string, data?: unknown): void {
    console.log(this.formatMessage('INFO', context, message, data));
  }

  static warn(context: string, message: string, data?: unknown): void {
    console.warn(this.formatMessage('WARN', context, message, data));
  }

  static error(context: string, message: string, error?: unknown): void {
    const errData = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(this.formatMessage('ERROR', context, message, errData));
  }

  static debug(context: string, message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', context, message, data));
    }
  }
}

