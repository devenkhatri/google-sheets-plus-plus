import { store } from '../store';
import { addNotification } from '../store/slices/uiSlice';

export interface PushNotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notifications
   */
  public async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported in this browser');
      return;
    }

    try {
      // Wait for service worker to be ready
      this.registration = await navigator.serviceWorker.ready;
      
      // Check if user is already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('User is already subscribed to push notifications');
        // Sync subscription with server
        await this.syncSubscriptionWithServer();
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Check if push notifications are supported
   */
  public isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Check if user has granted notification permission
   */
  public hasPermission(): boolean {
    return Notification.permission === 'granted';
  }

  /**
   * Check if user is subscribed to push notifications
   */
  public isSubscribed(): boolean {
    return this.subscription !== null;
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      store.dispatch(addNotification({
        type: 'success',
        message: 'Push notifications enabled successfully!'
      }));
    } else if (permission === 'denied') {
      store.dispatch(addNotification({
        type: 'error',
        message: 'Push notifications were denied. You can enable them in your browser settings.'
      }));
    }

    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if (!this.hasPermission()) {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return null;
      }
    }

    try {
      // Get VAPID public key from server
      const vapidPublicKey = await this.getVapidPublicKey();
      
      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);

      store.dispatch(addNotification({
        type: 'success',
        message: 'Successfully subscribed to push notifications!'
      }));

      return this.subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      store.dispatch(addNotification({
        type: 'error',
        message: 'Failed to subscribe to push notifications'
      }));
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      // Unsubscribe from push manager
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        // Remove subscription from server
        await this.removeSubscriptionFromServer();
        this.subscription = null;
        
        store.dispatch(addNotification({
          type: 'success',
          message: 'Successfully unsubscribed from push notifications'
        }));
      }

      return success;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      store.dispatch(addNotification({
        type: 'error',
        message: 'Failed to unsubscribe from push notifications'
      }));
      return false;
    }
  }

  /**
   * Get VAPID public key from server
   */
  private async getVapidPublicKey(): Promise<string> {
    const response = await fetch('/api/push/vapid-public-key');
    
    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }

    const data = await response.json();
    return data.publicKey;
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    const subscriptionData: PushNotificationSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(): Promise<void> {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }
  }

  /**
   * Sync existing subscription with server
   */
  private async syncSubscriptionWithServer(): Promise<void> {
    if (!this.subscription) {
      return;
    }

    try {
      await this.sendSubscriptionToServer(this.subscription);
    } catch (error) {
      console.error('Error syncing subscription with server:', error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Show a test notification
   */
  public async showTestNotification(): Promise<void> {
    if (!this.hasPermission()) {
      throw new Error('Notification permission not granted');
    }

    const notification = new Notification('Test Notification', {
      body: 'This is a test notification from Airtable Clone',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-notification',
      requireInteraction: false
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
}

export const pushNotificationService = PushNotificationService.getInstance();