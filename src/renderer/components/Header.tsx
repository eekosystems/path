import React from 'react';
import { PanelRightOpen, LogOut, User, Keyboard } from 'lucide-react';
import { useStore } from '../store';
import { Tooltip } from './common/Tooltip';
import logoPath from '../assets/path-immigration-logo.webp';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, setUser, addNotification, isSidebarOpen, isSidebarCollapsed } = useStore();

  const handleLogout = async () => {
    if (window.electronAPI) {
      await window.electronAPI.logout();
      setUser(null);
      addNotification('Successfully logged out', 'info');
      // Reload the page to reset the app state
      window.location.reload();
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-[22px] bg-white border-b border-neutral-200 shadow-elevation-1 sticky top-0 z-20 animate-slide-down">
      <div className="flex items-center gap-4">
        <img 
          src={logoPath} 
          alt="Path Immigration Logo" 
          className="w-auto hover-scale transition-transform duration-300"
          style={{ height: '48px' }}
        />
      </div>
      
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-neutral-50 rounded-lg shadow-inner-1 animate-fade-in">
              <User className="w-4 h-4 text-navy-600" />
              <span className="text-sm font-medium text-navy-700">{user.name}</span>
            </div>
            
            {/* Keyboard shortcut hint for desktop */}
            {isSidebarOpen && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-600 px-3 py-1.5 bg-gradient-to-r from-neutral-100 to-neutral-50 rounded-md shadow-inner-1 animate-fade-in">
                <Keyboard className="w-3 h-3" />
                <span className="font-medium">Ctrl+B to {isSidebarCollapsed ? 'expand' : 'collapse'}</span>
              </div>
            )}
            
            <Tooltip text="Logout">
              <button
                onClick={handleLogout}
                className="icon-button text-neutral-600 hover:text-error-600 hover:bg-error-50"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        )}
        
        <button
          onClick={onToggleSidebar}
          className="icon-button text-neutral-600 hover:text-navy-700 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <PanelRightOpen className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};