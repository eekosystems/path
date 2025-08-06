import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Store from 'electron-store';
import log from '../log';
import { AuthResponse } from '../types/ipc';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
}

interface AuthToken {
  userId: string;
  email: string;
  role: string;
}

const AUTH_TOKEN_KEY = 'auth-token';
const USERS_KEY = 'users';
const JWT_SECRET = process.env.JWT_SECRET || 'clerk-jwt-secret-dev-only';
const TOKEN_EXPIRY = '7d';

class AuthService {
  private store: Store;
  private currentUser: User | null = null;

  constructor() {
    this.store = new Store({
      name: 'clerk-auth',
      encryptionKey: process.env.AUTH_ENCRYPTION_KEY || 'clerk-auth-key-dev'
    });
    
    // Initialize with a default admin user if no users exist
    this.initializeDefaultUser();
  }

  private async initializeDefaultUser(): Promise<void> {
    const users = this.store.get(USERS_KEY, {}) as Record<string, User>;
    
    if (Object.keys(users).length === 0) {
      const defaultUser: User = {
        id: 'admin-001',
        email: 'admin@clerk.app',
        name: 'Administrator',
        role: 'admin',
        passwordHash: await bcrypt.hash('admin123', 10)
      };
      
      users[defaultUser.id] = defaultUser;
      this.store.set(USERS_KEY, users);
      log.info('Default admin user created');
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const users = this.store.get(USERS_KEY, {}) as Record<string, User>;
      const user = Object.values(users).find(u => u.email === email);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role } as AuthToken,
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );
      
      // Store token
      this.store.set(AUTH_TOKEN_KEY, token);
      this.currentUser = user;
      
      log.info('User logged in', { userId: user.id, email: user.email });
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      };
    } catch (error) {
      log.error('Login failed', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async logout(): Promise<void> {
    this.store.delete(AUTH_TOKEN_KEY);
    this.currentUser = null;
    log.info('User logged out');
  }

  async getCurrentUser(): Promise<User | null> {
    // Check for license-based user first
    try {
      const { licenseService } = await import('./license');
      const licenseInfo = await licenseService.getLicenseInfo();
      
      if (licenseInfo.isLicensed) {
        // Return a virtual user based on license
        return {
          id: licenseInfo.licenseKey || 'licensed-user',
          email: licenseInfo.email || 'user@clerk.app',
          name: 'Licensed User',
          role: 'user',
          passwordHash: '' // Not used for license-based auth
        };
      }
    } catch (error) {
      log.error('License check failed in getCurrentUser', error);
    }
    
    // Fall back to traditional token-based auth
    if (this.currentUser) {
      return this.currentUser;
    }
    
    const token = this.store.get(AUTH_TOKEN_KEY) as string | undefined;
    if (!token) {
      return null;
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
      const users = this.store.get(USERS_KEY, {}) as Record<string, User>;
      const user = users[decoded.userId];
      
      if (user) {
        this.currentUser = user;
        return user;
      }
    } catch (error) {
      log.error('Token verification failed', error);
      this.store.delete(AUTH_TOKEN_KEY);
    }
    
    return null;
  }

  async createUser(email: string, password: string, name: string, role: string = 'user'): Promise<User> {
    const users = this.store.get(USERS_KEY, {}) as Record<string, User>;
    
    // Check if user already exists
    if (Object.values(users).some(u => u.email === email)) {
      throw new Error('User with this email already exists');
    }
    
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10)
    };
    
    users[newUser.id] = newUser;
    this.store.set(USERS_KEY, users);
    
    log.info('New user created', { userId: newUser.id, email: newUser.email });
    return newUser;
  }

  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const users = this.store.get(USERS_KEY, {}) as Record<string, User>;
    const user = users[userId];
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid current password');
    }
    
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    users[userId] = user;
    this.store.set(USERS_KEY, users);
    
    log.info('Password updated', { userId });
    return true;
  }

  async refreshToken(): Promise<string | null> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      return null;
    }
    
    const token = jwt.sign(
      { userId: currentUser.id, email: currentUser.email, role: currentUser.role } as AuthToken,
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    this.store.set(AUTH_TOKEN_KEY, token);
    return token;
  }
}

export const authService = new AuthService();