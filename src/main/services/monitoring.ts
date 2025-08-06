import * as Sentry from '@sentry/electron/main';
import { app } from 'electron';
import log from '../log';

export interface MonitoringConfig {
  dsn?: string;
  environment?: string;
  enableInDevelopment?: boolean;
}

class MonitoringService {
  private initialized = false;

  initialize(config: MonitoringConfig = {}): void {
    if (this.initialized) return;

    const isDevelopment = !app.isPackaged;
    const environment = config.environment || (isDevelopment ? 'development' : 'production');

    // Skip initialization in development unless explicitly enabled
    if (isDevelopment && !config.enableInDevelopment) {
      log.info('Monitoring disabled in development mode');
      return;
    }

    // Initialize Sentry
    Sentry.init({
      dsn: config.dsn || process.env.SENTRY_DSN,
      environment,
      release: app.getVersion(),
      // Note: Sentry integrations API has changed in newer versions
      // integrations: [],
      beforeSend: (event, hint) => {
        // Filter out sensitive information
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }

        // Don't send events in development unless explicitly enabled
        if (isDevelopment && !config.enableInDevelopment) {
          return null;
        }

        // Log the error locally as well
        log.error('Sentry event', { event, hint });

        return event;
      },
      tracesSampleRate: isDevelopment ? 1.0 : 0.1,
    });

    this.initialized = true;
    log.info('Monitoring service initialized', { environment });
  }

  captureException(error: Error, context?: Record<string, any>): void {
    if (!this.initialized) {
      log.error('Monitoring not initialized', { error, context });
      return;
    }

    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    if (!this.initialized) {
      log.info('Monitoring not initialized', { message, level });
      return;
    }

    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.initialized) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }

  clearUser(): void {
    if (!this.initialized) return;

    Sentry.setUser(null);
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, any>;
  }): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });
  }

  startTransaction(name: string, op: string): any {
    if (!this.initialized) return null;

    // Note: startTransaction API has changed in newer versions of Sentry
    // For now, return a mock transaction object
    return {
      finish: () => {},
      setStatus: () => {},
      setData: () => {},
    };
  }

  // Performance monitoring for AI generation
  measureAIGeneration(
    model: string,
    sectionTitle: string,
    callback: () => Promise<any>
  ): Promise<any> {
    const transaction = this.startTransaction('ai.generate', 'ai');
    
    if (transaction) {
      transaction.setTag('ai.model', model);
      transaction.setTag('ai.section', sectionTitle);
    }

    const startTime = Date.now();

    return callback()
      .then(result => {
        const duration = Date.now() - startTime;
        
        this.addBreadcrumb({
          message: 'AI generation completed',
          category: 'ai',
          level: 'info',
          data: {
            model,
            sectionTitle,
            duration,
            success: true,
          },
        });

        if (transaction) {
          transaction.setStatus('ok');
          transaction.finish();
        }

        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        
        this.addBreadcrumb({
          message: 'AI generation failed',
          category: 'ai',
          level: 'error',
          data: {
            model,
            sectionTitle,
            duration,
            error: error.message,
          },
        });

        if (transaction) {
          transaction.setStatus('internal_error');
          transaction.finish();
        }

        throw error;
      });
  }

  // Track feature usage
  trackFeatureUsage(feature: string, properties?: Record<string, any>): void {
    this.addBreadcrumb({
      message: `Feature used: ${feature}`,
      category: 'feature',
      level: 'info',
      data: properties,
    });
  }

  // Monitor resource usage
  startResourceMonitoring(): void {
    if (!this.initialized) return;

    setInterval(() => {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      this.addBreadcrumb({
        message: 'Resource usage',
        category: 'performance',
        level: 'debug',
        data: {
          memory: {
            rss: Math.round(usage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024),
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
        },
      });
    }, 60000); // Every minute
  }
}

export const monitoringService = new MonitoringService();