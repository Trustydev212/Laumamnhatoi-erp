'use client';

import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/lib/realtime-context';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationSystemProps {
  onNotification?: (notification: Notification) => void;
}

export default function NotificationSystem({ onNotification }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const { socket } = useRealtime();

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time events
    socket.on('user_created', (data: any) => {
      addNotification({
        type: 'success',
        title: 'User Created',
        message: `New user "${data.username}" has been created`,
        action: {
          label: 'View Users',
          onClick: () => window.location.href = '/admin?tab=user-management'
        }
      });
    });

    socket.on('user_updated', (data: any) => {
      addNotification({
        type: 'info',
        title: 'User Updated',
        message: `User "${data.username}" has been updated`,
        action: {
          label: 'View Users',
          onClick: () => window.location.href = '/admin?tab=user-management'
        }
      });
    });

    socket.on('user_deleted', (data: any) => {
      addNotification({
        type: 'warning',
        title: 'User Deleted',
        message: `User "${data.username}" has been deleted`
      });
    });

    socket.on('user_login', (data: any) => {
      addNotification({
        type: 'info',
        title: 'User Login',
        message: `User "${data.username}" logged in`
      });
    });

    socket.on('user_logout', (data: any) => {
      addNotification({
        type: 'info',
        title: 'User Logout',
        message: `User "${data.username}" logged out`
      });
    });

    socket.on('system_error', (data: any) => {
      addNotification({
        type: 'error',
        title: 'System Error',
        message: data.message || 'A system error occurred'
      });
    });

    socket.on('order_created', (data: any) => {
      addNotification({
        type: 'success',
        title: 'New Order',
        message: `Order #${data.orderNumber} has been created`,
        action: {
          label: 'View Orders',
          onClick: () => window.location.href = '/pos'
        }
      });
    });

    socket.on('inventory_low', (data: any) => {
      addNotification({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${data.ingredient} is running low (${data.quantity} remaining)`,
        action: {
          label: 'View Inventory',
          onClick: () => window.location.href = '/inventory'
        }
      });
    });

    return () => {
      socket.off('user_created');
      socket.off('user_updated');
      socket.off('user_deleted');
      socket.off('user_login');
      socket.off('user_logout');
      socket.off('system_error');
      socket.off('order_created');
      socket.off('inventory_low');
    };
  }, [socket]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
    onNotification?.(newNotification);

    // Auto-remove after 10 seconds for non-error notifications
    if (notification.type !== 'error') {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 10000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'info':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {showPanel && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'bg-blue-50' : ''
                    } hover:bg-gray-50 cursor-pointer`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-lg">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {notification.timestamp.toLocaleString()}
                        </p>
                        {notification.action && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              notification.action?.onClick();
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {notification.action.label} →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setNotifications([])}
                  className="w-full text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showPanel && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPanel(false)}
        />
      )}
    </>
  );
}
