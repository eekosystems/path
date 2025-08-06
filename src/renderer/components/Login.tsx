import React, { useState } from 'react';
import { Globe, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../store';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, addNotification } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!window.electronAPI) {
        throw new Error('Authentication service not available');
      }

      const response = await window.electronAPI.login({ email, password });
      
      if (response.success && response.user) {
        setUser(response.user);
        addNotification('Successfully logged in', 'success');
        onSuccess();
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gold-50 via-neutral-50 to-navy-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="bg-white rounded-2xl shadow-elevation-5 p-8 border border-neutral-200">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-gold-500 to-gold-600 p-4 rounded-2xl shadow-elevation-3 animate-scale-in">
                <Globe className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-navy-900 animate-slide-up">Clerk</h1>
            <p className="text-neutral-600 mt-2 animate-slide-up" style={{animationDelay: '100ms'}}>AI Immigration Letter Assistant</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-error-50 border border-error-200 rounded-lg flex items-center gap-2 text-error-700 animate-slide-down shadow-elevation-1">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="form-label">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400 transition-colors group-hover:text-gold-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-10"
                  placeholder="admin@clerk.app"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400 transition-colors group-hover:text-gold-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary text-lg py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center animate-fade-in" style={{animationDelay: '200ms'}}>
            <p className="text-sm text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2 inline-block shadow-inner-1">
              Default credentials: admin@clerk.app / admin123
            </p>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-neutral-600 animate-fade-in" style={{animationDelay: '300ms'}}>
          <p>© 2024 Eeko Systems. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};