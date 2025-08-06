import log from '../log';

interface RateLimiterOptions {
  points: number; // Number of requests
  duration: number; // Time window in seconds
  blockDuration: number; // Block duration in seconds
}

interface RateLimiterRecord {
  points: number;
  resetTime: number;
  blockedUntil?: number;
}

class RateLimiter {
  private limiters: Map<string, Map<string, RateLimiterRecord>> = new Map();

  create(name: string, options: RateLimiterOptions) {
    const limiterRecords = new Map<string, RateLimiterRecord>();
    this.limiters.set(name, limiterRecords);

    return {
      consume: async (key: string, points: number = 1): Promise<void> => {
        const now = Date.now();
        const record = limiterRecords.get(key) || {
          points: 0,
          resetTime: now + (options.duration * 1000)
        };

        // Check if blocked
        if (record.blockedUntil && now < record.blockedUntil) {
          const msBeforeNext = record.blockedUntil - now;
          throw { msBeforeNext };
        }

        // Reset if time window expired
        if (now >= record.resetTime) {
          record.points = 0;
          record.resetTime = now + (options.duration * 1000);
          delete record.blockedUntil;
        }

        // Check if would exceed limit
        if (record.points + points > options.points) {
          record.blockedUntil = now + (options.blockDuration * 1000);
          limiterRecords.set(key, record);
          
          const msBeforeNext = record.blockedUntil - now;
          log.warn(`Rate limit exceeded for ${name}:${key}`, { 
            points: record.points, 
            limit: options.points,
            blockedFor: options.blockDuration 
          });
          
          throw { msBeforeNext };
        }

        // Consume points
        record.points += points;
        limiterRecords.set(key, record);
      },

      reset: (key: string): void => {
        limiterRecords.delete(key);
      },

      getStatus: (key: string): { points: number; remaining: number; resetIn: number } => {
        const now = Date.now();
        const record = limiterRecords.get(key);
        
        if (!record) {
          return {
            points: 0,
            remaining: options.points,
            resetIn: options.duration
          };
        }

        if (now >= record.resetTime) {
          return {
            points: 0,
            remaining: options.points,
            resetIn: options.duration
          };
        }

        return {
          points: record.points,
          remaining: Math.max(0, options.points - record.points),
          resetIn: Math.ceil((record.resetTime - now) / 1000)
        };
      }
    };
  }

  resetAll(): void {
    this.limiters.clear();
    log.info('All rate limiters reset');
  }
}

export const rateLimiter = new RateLimiter();