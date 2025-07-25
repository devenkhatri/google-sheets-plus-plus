import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pushNotificationService } from '../pushNotificationService';

// Mock global objects
const mockServiceWorkerRegistration = {
  pushManager: {
    getSubscription: vi.fn(),
    subscribe: vi.fn()
  }
} as any;

const mockPushSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  getKey: vi.fn(),
  unsubscribe: vi.fn()
} as any;

// Mock Notification globally
const mockNotification = {
  permission: 'default',
  requestPermission: vi.fn()
};

Object.defineProperty(global, 'Notification', {
  value: mockNotification,
  writable: true
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      ready: Promise.resolve(mockServiceWorkerRegistration)
    }
  },
  writable: true
});

// Mock window objects
Object.defineProperty(global, 'window', {
  value: {
    PushManager: vi.fn(),
    Notification: mockNotification,
    atob: vi.fn((str) => str),
    btoa: vi.fn((str) => str)
  },
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('PushNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ publicKey: 'test-vapid-key' })
    });
  });

  describe('isSupported', () => {
    it('should return true when push notifications are supported', () => {
      expect(pushNotificationService.isSupported()).toBe(true);
    });

    it('should return false when service worker is not supported', () => {
      const originalNavigator = global.navigator;
      (global as any).navigator = {};
      
      expect(pushNotificationService.isSupported()).toBe(false);
      
      global.navigator = originalNavigator;
    });
  });

  describe('hasPermission', () => {
    it('should return true when permission is granted', () => {
      mockNotification.permission = 'granted';
      expect(pushNotificationService.hasPermission()).toBe(true);
    });

    it('should return false when permission is denied', () => {
      mockNotification.permission = 'denied';
      expect(pushNotificationService.hasPermission()).toBe(false);
    });
  });

  describe('requestPermission', () => {
    it('should request and return granted permission', async () => {
      mockNotification.requestPermission.mockResolvedValue('granted');
      
      const permission = await pushNotificationService.requestPermission();
      
      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(permission).toBe('granted');
    });

    it('should throw error if push notifications are not supported', async () => {
      const originalNavigator = global.navigator;
      (global as any).navigator = {};
      
      await expect(pushNotificationService.requestPermission()).rejects.toThrow(
        'Push notifications are not supported'
      );
      
      global.navigator = originalNavigator;
    });
  });

  describe('subscribe', () => {
    beforeEach(() => {
      mockNotification.permission = 'granted';
      mockPushSubscription.getKey.mockImplementation((type: string) => {
        if (type === 'p256dh') return new ArrayBuffer(8);
        if (type === 'auth') return new ArrayBuffer(8);
        return null;
      });
      mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockPushSubscription);
      mockLocalStorage.getItem.mockReturnValue('test-token');
      
      // Set up the service registration
      (pushNotificationService as any).registration = mockServiceWorkerRegistration;
    });

    it('should successfully subscribe to push notifications', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ publicKey: 'test-vapid-key' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Subscribed successfully' })
        });

      const subscription = await pushNotificationService.subscribe();

      expect(mockServiceWorkerRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array)
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: expect.stringContaining('endpoint')
      });

      expect(subscription).toBe(mockPushSubscription);
    });

    it('should return null if permission is not granted', async () => {
      mockNotification.permission = 'denied';
      mockNotification.requestPermission.mockResolvedValue('denied');

      const subscription = await pushNotificationService.subscribe();

      expect(subscription).toBeNull();
      expect(mockServiceWorkerRegistration.pushManager.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should successfully unsubscribe from push notifications', async () => {
      // Set up existing subscription
      await pushNotificationService.initialize();
      (pushNotificationService as any).subscription = mockPushSubscription;
      
      mockPushSubscription.unsubscribe.mockResolvedValue(true);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Unsubscribed successfully' })
      });
      mockLocalStorage.getItem.mockReturnValue('test-token');

      const result = await pushNotificationService.unsubscribe();

      expect(mockPushSubscription.unsubscribe).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      expect(result).toBe(true);
    });

    it('should return true if no subscription exists', async () => {
      const result = await pushNotificationService.unsubscribe();
      expect(result).toBe(true);
    });
  });

  describe('showTestNotification', () => {
    it('should show a test notification', async () => {
      mockNotification.permission = 'granted';
      
      const mockNotificationInstance = {
        close: vi.fn()
      };
      
      const NotificationConstructor = vi.fn().mockImplementation(() => mockNotificationInstance);
      Object.defineProperty(global, 'Notification', {
        value: Object.assign(NotificationConstructor, { permission: 'granted' }),
        writable: true
      });
      
      vi.useFakeTimers();
      
      await pushNotificationService.showTestNotification();
      
      expect(NotificationConstructor).toHaveBeenCalledWith('Test Notification', {
        body: 'This is a test notification from Airtable Clone',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test-notification',
        requireInteraction: false
      });
      
      // Fast-forward time to trigger auto-close
      vi.advanceTimersByTime(5000);
      expect(mockNotificationInstance.close).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should throw error if permission is not granted', async () => {
      Object.defineProperty(global, 'Notification', {
        value: Object.assign(vi.fn(), { permission: 'denied' }),
        writable: true
      });
      
      await expect(pushNotificationService.showTestNotification()).rejects.toThrow(
        'Notification permission not granted'
      );
    });
  });
});