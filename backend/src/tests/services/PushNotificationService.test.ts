import { PushNotificationService } from '../../services/PushNotificationService';
import { PushSubscriptionModel } from '../../models/PushSubscription';
import webpush from 'web-push';

// Mock dependencies
jest.mock('../../models/PushSubscription');
jest.mock('web-push');
jest.mock('../../utils/logger');

const mockPushSubscriptionModel = PushSubscriptionModel as jest.Mocked<typeof PushSubscriptionModel>;
const mockWebpush = webpush as jest.Mocked<typeof webpush>;

describe('PushNotificationService', () => {
  let pushNotificationService: PushNotificationService;

  beforeEach(() => {
    // Mock environment variables before getting instance
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_EMAIL = 'test@example.com';
    
    // Reset singleton instance
    (PushNotificationService as any).instance = null;
    pushNotificationService = PushNotificationService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_EMAIL;
    // Reset singleton instance
    (PushNotificationService as any).instance = null;
  });

  describe('getVapidPublicKey', () => {
    it('should return the VAPID public key', () => {
      const publicKey = pushNotificationService.getVapidPublicKey();
      expect(publicKey).toBe('test-public-key');
    });

    it('should return null if VAPID keys are not configured', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      
      // Reset and create new instance to test without keys
      (PushNotificationService as any).instance = null;
      const newService = PushNotificationService.getInstance();
      const publicKey = newService.getVapidPublicKey();
      expect(publicKey).toBeNull();
    });
  });

  describe('subscribe', () => {
    const mockSubscriptionData = {
      userId: 'user-123',
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      p256dhKey: 'test-p256dh-key',
      authKey: 'test-auth-key',
      userAgent: 'Mozilla/5.0 Test Browser'
    };

    it('should create a new subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: mockSubscriptionData.userId,
        endpoint: mockSubscriptionData.endpoint,
        p256dh_key: mockSubscriptionData.p256dhKey,
        auth_key: mockSubscriptionData.authKey,
        user_agent: mockSubscriptionData.userAgent,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPushSubscriptionModel.upsert.mockResolvedValue(mockSubscription);

      const result = await pushNotificationService.subscribe(
        mockSubscriptionData.userId,
        mockSubscriptionData.endpoint,
        mockSubscriptionData.p256dhKey,
        mockSubscriptionData.authKey,
        mockSubscriptionData.userAgent
      );

      expect(mockPushSubscriptionModel.upsert).toHaveBeenCalledWith({
        user_id: mockSubscriptionData.userId,
        endpoint: mockSubscriptionData.endpoint,
        p256dh_key: mockSubscriptionData.p256dhKey,
        auth_key: mockSubscriptionData.authKey,
        user_agent: mockSubscriptionData.userAgent
      });

      expect(result).toEqual(mockSubscription);
    });
  });

  describe('sendToUser', () => {
    const mockUserId = 'user-123';
    const mockPayload = {
      title: 'Test Notification',
      body: 'This is a test notification',
      data: { test: true }
    };

    it('should send push notification to all user subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          user_id: mockUserId,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test1',
          p256dh_key: 'key1',
          auth_key: 'auth1',
          user_agent: 'Browser 1',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'sub-2',
          user_id: mockUserId,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dh_key: 'key2',
          auth_key: 'auth2',
          user_agent: 'Browser 2',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPushSubscriptionModel.findByUserId.mockResolvedValue(mockSubscriptions);
      mockWebpush.sendNotification.mockResolvedValue({} as any);

      await pushNotificationService.sendToUser(mockUserId, mockPayload);

      expect(mockPushSubscriptionModel.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(2);
      
      // Check first subscription call
      expect(mockWebpush.sendNotification).toHaveBeenCalledWith(
        {
          endpoint: mockSubscriptions[0].endpoint,
          keys: {
            p256dh: mockSubscriptions[0].p256dh_key,
            auth: mockSubscriptions[0].auth_key
          }
        },
        JSON.stringify({
          title: mockPayload.title,
          body: mockPayload.body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: {
            ...mockPayload.data,
            url: '/'
          }
        })
      );
    });

    it('should handle expired subscriptions', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: mockUserId,
        endpoint: 'https://fcm.googleapis.com/fcm/send/expired',
        p256dh_key: 'key1',
        auth_key: 'auth1',
        user_agent: 'Browser 1',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPushSubscriptionModel.findByUserId.mockResolvedValue([mockSubscription]);
      
      // Mock expired subscription error
      const expiredError = new Error('Subscription expired') as any;
      expiredError.statusCode = 410;
      mockWebpush.sendNotification.mockRejectedValue(expiredError);
      
      mockPushSubscriptionModel.delete.mockResolvedValue(true);

      await pushNotificationService.sendToUser(mockUserId, mockPayload);

      expect(mockPushSubscriptionModel.delete).toHaveBeenCalledWith(mockSubscription.id);
    });

    it('should return early if no VAPID keys configured', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      
      // Reset and create new instance without keys
      (PushNotificationService as any).instance = null;
      const newService = PushNotificationService.getInstance();
      
      await newService.sendToUser(mockUserId, mockPayload);

      expect(mockPushSubscriptionModel.findByUserId).not.toHaveBeenCalled();
      expect(mockWebpush.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    const mockUserId = 'user-123';
    const mockEndpoint = 'https://fcm.googleapis.com/fcm/send/test';

    it('should unsubscribe specific endpoint', async () => {
      mockPushSubscriptionModel.deleteByUserAndEndpoint.mockResolvedValue(true);

      const result = await pushNotificationService.unsubscribe(mockUserId, mockEndpoint);

      expect(mockPushSubscriptionModel.deleteByUserAndEndpoint).toHaveBeenCalledWith(
        mockUserId,
        mockEndpoint
      );
      expect(result).toBe(true);
    });

    it('should unsubscribe all user subscriptions if no endpoint provided', async () => {
      mockPushSubscriptionModel.deleteByUserId.mockResolvedValue(2);

      const result = await pushNotificationService.unsubscribe(mockUserId);

      expect(mockPushSubscriptionModel.deleteByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toBe(true);
    });
  });

  describe('sendTestNotification', () => {
    it('should send a test notification', async () => {
      const mockUserId = 'user-123';
      const mockSubscription = {
        id: 'sub-1',
        user_id: mockUserId,
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh_key: 'key1',
        auth_key: 'auth1',
        user_agent: 'Browser 1',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPushSubscriptionModel.findByUserId.mockResolvedValue([mockSubscription]);
      mockWebpush.sendNotification.mockResolvedValue({} as any);

      await pushNotificationService.sendTestNotification(mockUserId);

      expect(mockWebpush.sendNotification).toHaveBeenCalledWith(
        {
          endpoint: mockSubscription.endpoint,
          keys: {
            p256dh: mockSubscription.p256dh_key,
            auth: mockSubscription.auth_key
          }
        },
        JSON.stringify({
          title: 'Test Notification',
          body: 'This is a test notification from Airtable Clone',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: {
            test: true,
            url: '/'
          }
        })
      );
    });
  });
});