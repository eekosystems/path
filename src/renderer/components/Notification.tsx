import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { Notification as NotificationType } from '../types';

interface NotificationProps {
  notification: NotificationType;
  onDismiss: (id: number) => void;
}

export const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const { id, message, type } = notification;
  
  const baseClasses = 'p-4 rounded-xl shadow-elevation-4 flex items-start gap-3 w-full max-w-sm transition-all duration-300 animate-slide-in backdrop-blur-sm';
  
  const typeClasses = {
    success: 'bg-success-50/95 text-success-800 border border-success-200',
    error: 'bg-error-50/95 text-error-800 border border-error-200',
    info: 'bg-sky-50/95 text-sky-800 border border-sky-200'
  };
  
  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  }[type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" />
      <span className="flex-grow">{message}</span>
      <button 
        onClick={() => onDismiss(id)} 
        className="p-1 -m-1 rounded-full hover:bg-black/10 transition-all duration-200 hover:scale-110 active:scale-95"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface NotificationContainerProps {
  notifications: NotificationType[];
  onDismiss: (id: number) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ 
  notifications, 
  onDismiss 
}) => {
  return (
    <div className="fixed top-20 right-4 z-[60] space-y-3 w-full max-w-sm pointer-events-none">
      <div className="space-y-3 pointer-events-auto">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};