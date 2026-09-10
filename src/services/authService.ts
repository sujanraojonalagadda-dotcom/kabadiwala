import { UserProfile, AuthSendOtpResponse, AuthVerifyOtpResponse, UserRole } from '../types.js';
import { firestoreService } from './firestoreService.js';

const STORAGE_KEY_USER = 'kabadiwala_user';
const STORAGE_KEY_TOKEN = 'kabadiwala_token';

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Array<(user: UserProfile | null) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch {
      this.currentUser = null;
    }
  }

  public subscribe(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentUser && this.currentUser.phone);
  }

  public async checkSmsStatus(): Promise<{ smsConfigured: boolean; provider: string; geminiConfigured: boolean }> {
    try {
      const res = await fetch('/api/auth/sms-status');
      if (!res.ok) throw new Error('Status check failed');
      return await res.json();
    } catch {
      return { smsConfigured: false, provider: 'None', geminiConfigured: false };
    }
  }

  public async sendOtp(phone: string, isGuidedTestMode: boolean): Promise<AuthSendOtpResponse> {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, isGuidedTestMode }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        smsConfigured: false,
        message: 'Network error. Could not connect to authentication service.',
      };
    }
  }

  public async verifyOtp(phone: string, otp: string, isGuidedTestMode: boolean): Promise<AuthVerifyOtpResponse> {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, isGuidedTestMode }),
      });
      const data: AuthVerifyOtpResponse = await res.json();
      if (data.success && data.user) {
        this.currentUser = data.user;
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
        }
        this.notify();
        firestoreService.saveUser(data.user).catch((err) => console.warn('Firestore sync user warning:', err));
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: 'Verification request failed due to a network error.',
      };
    }
  }

  public async registerCollector(profileData: {
    phone: string;
    name: string;
    preferredLanguage: string;
    location: string;
    role?: UserRole;
  }): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    try {
      const res = await fetch('/api/auth/register-collector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (data.success && data.user) {
        this.currentUser = data.user;
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        this.notify();
        firestoreService.saveUser(data.user).catch((err) => console.warn('Firestore sync user warning:', err));
      }
      return data;
    } catch {
      return { success: false, message: 'Could not register collector profile.' };
    }
  }

  public switchRole(newRole: UserRole) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, role: newRole };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(this.currentUser));
      this.notify();
      firestoreService.saveUser(this.currentUser).catch((err) => console.warn('Firestore sync user warning:', err));
    }
  }

  public logout() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    this.notify();
  }
}

export const authService = new AuthService();
