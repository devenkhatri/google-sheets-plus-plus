# Push Notifications

This document describes the push notification system implemented in the Airtable Clone application.

## Overview

The push notification system allows users to receive real-time notifications about:
- Comments and mentions on records
- Base sharing and permission changes
- Important system updates

## Architecture

The push notification system consists of:

1. **Backend Service** (`PushNotificationService`): Manages subscriptions and sends notifications
2. **Frontend Service** (`pushNotificationService`): Handles subscription management and permission requests
3. **Service Worker**: Receives and displays push notifications
4. **Database**: Stores push subscriptions

## Setup

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for push notifications:

```bash
cd backend
npm run generate-vapid
```

Add the generated keys to your `.env` file:

```env
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_EMAIL=mailto:admin@yourdomain.com
```

### 2. Database Migration

The push subscriptions table is created by migration `021_create_push_subscriptions_table.ts`. Run migrations:

```bash
cd backend
npm run migrate
```

### 3. Frontend Configuration

The frontend automatically initializes push notifications when the service worker is ready. No additional configuration is needed.

## API Endpoints

### Get VAPID Public Key
```
GET /api/push/vapid-public-key
```
Returns the VAPID public key needed for subscription.

### Subscribe to Push Notifications
```
POST /api/push/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### Unsubscribe from Push Notifications
```
POST /api/push/unsubscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..." // optional
}
```

### Send Test Notification
```
POST /api/push/test
Authorization: Bearer <token>
```

### Get Subscription Status
```
GET /api/push/status
Authorization: Bearer <token>
```

## Frontend Usage

### Check Support and Permission
```typescript
import { pushNotificationService } from './services/pushNotificationService';

// Check if push notifications are supported
if (pushNotificationService.isSupported()) {
  // Check if user has granted permission
  if (pushNotificationService.hasPermission()) {
    console.log('Push notifications are enabled');
  } else {
    // Request permission
    const permission = await pushNotificationService.requestPermission();
    if (permission === 'granted') {
      console.log('Permission granted');
    }
  }
}
```

### Subscribe to Push Notifications
```typescript
try {
  const subscription = await pushNotificationService.subscribe();
  if (subscription) {
    console.log('Successfully subscribed to push notifications');
  }
} catch (error) {
  console.error('Failed to subscribe:', error);
}
```

### Unsubscribe from Push Notifications
```typescript
try {
  const success = await pushNotificationService.unsubscribe();
  if (success) {
    console.log('Successfully unsubscribed');
  }
} catch (error) {
  console.error('Failed to unsubscribe:', error);
}
```

## Backend Usage

### Send Notification to User
```typescript
import { PushNotificationService } from './services/PushNotificationService';

const pushService = PushNotificationService.getInstance();

await pushService.sendToUser('user-id', {
  title: 'New Comment',
  body: 'Someone commented on your record',
  data: { recordId: 'record-123' },
  url: '/bases/base-123/tables/table-456/records/record-123'
});
```

### Send Notification for Database Notification
```typescript
import { NotificationService } from './services/NotificationService';

const notificationService = NotificationService.getInstance();

// This automatically sends both database and push notifications
await notificationService.createNotification({
  user_id: 'user-123',
  type: 'comment',
  title: 'New Comment',
  message: 'John Doe commented on your record',
  entity_type: 'record',
  entity_id: 'record-123',
  metadata: {
    baseId: 'base-123',
    tableId: 'table-456',
    commentId: 'comment-789'
  }
});
```

## Service Worker

The service worker handles incoming push notifications and displays them to the user. It also handles notification clicks to navigate to the relevant page.

Key features:
- Displays notifications with custom icons and badges
- Handles notification clicks to open the app
- Focuses existing windows or opens new ones as needed

## Security Considerations

1. **VAPID Keys**: Keep private keys secure and never commit them to version control
2. **Authentication**: All subscription endpoints require user authentication
3. **Rate Limiting**: Push notification sending is rate-limited to prevent abuse
4. **Subscription Cleanup**: Expired subscriptions are automatically cleaned up

## Browser Support

Push notifications are supported in:
- Chrome 42+
- Firefox 44+
- Safari 16+ (macOS 13+, iOS 16.4+)
- Edge 17+

## Troubleshooting

### Common Issues

1. **"Push notifications not supported"**
   - Check if the browser supports push notifications
   - Ensure the app is served over HTTPS (required for push notifications)

2. **"VAPID keys not configured"**
   - Generate VAPID keys using `npm run generate-vapid`
   - Add keys to your `.env` file

3. **Notifications not appearing**
   - Check if user has granted notification permission
   - Verify the service worker is registered and active
   - Check browser console for errors

4. **Subscription failed**
   - Ensure the backend is running and accessible
   - Check network connectivity
   - Verify authentication token is valid

### Testing

Run the test suites to verify functionality:

```bash
# Backend tests
cd backend
npm test -- --testPathPattern=PushNotificationService.test.ts

# Frontend tests
cd frontend
npm test -- --run pushNotificationService.test.ts
```

## Performance Considerations

1. **Batch Notifications**: Multiple notifications to the same user are batched to reduce API calls
2. **Cleanup**: Expired subscriptions are cleaned up regularly to maintain performance
3. **Error Handling**: Failed notifications don't block other operations
4. **Retry Logic**: Transient failures are retried with exponential backoff

## Future Enhancements

Potential improvements to the push notification system:

1. **Notification Preferences**: Allow users to customize which notifications they receive
2. **Rich Notifications**: Support for images and action buttons
3. **Notification Grouping**: Group related notifications together
4. **Analytics**: Track notification delivery and engagement rates
5. **A/B Testing**: Test different notification formats and timing