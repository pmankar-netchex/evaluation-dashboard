type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private sanitize(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'api_key',
      'apiKey',
      'authorization',
      'cookie',
      'session',
    ];

    const sanitized: Record<string, unknown> | unknown[] = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

      if (Array.isArray(sanitized)) {
        // For arrays, push the value
        if (isSensitive) {
          sanitized.push('[REDACTED]');
        } else if (typeof value === 'object' && value !== null) {
          sanitized.push(this.sanitize(value));
        } else {
          sanitized.push(value);
        }
      } else {
        // For objects, assign by key
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  private log(level: LogLevel, message: string, metadata?: LogMetadata) {
    const timestamp = new Date().toISOString();
    const sanitizedMetadata = metadata ? this.sanitize(metadata) : undefined;

    const logEntry: Record<string, unknown> = {
      timestamp,
      level,
      message,
    };

    if (sanitizedMetadata && !Array.isArray(sanitizedMetadata)) {
      logEntry.metadata = sanitizedMetadata;
    }

    if (this.isDevelopment) {
      logEntry.env = 'development';
    }

    // In production, send to logging service
    if (this.isProduction) {
      // TODO: Send to logging service (e.g., Datadog, Sentry, CloudWatch)
      // For now, just console.log in structured format
      console.log(JSON.stringify(logEntry));
    } else {
      // Development: pretty print
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, sanitizedMetadata);
          break;
        case 'warn':
          console.warn(prefix, message, sanitizedMetadata);
          break;
        case 'info':
          console.info(prefix, message, sanitizedMetadata);
          break;
        case 'debug':
          console.debug(prefix, message, sanitizedMetadata);
          break;
      }
    }
  }

  debug(message: string, metadata?: LogMetadata) {
    if (this.isDevelopment) {
      this.log('debug', message, metadata);
    }
  }

  info(message: string, metadata?: LogMetadata) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata) {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error | unknown, metadata?: LogMetadata) {
    const errorMetadata = {
      ...metadata,
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        },
      }),
    };

    this.log('error', message, errorMetadata);
  }
}

export const logger = new Logger();

