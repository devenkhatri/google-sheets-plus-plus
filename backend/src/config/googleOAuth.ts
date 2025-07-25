import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger';

// Create OAuth2 client
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

/**
 * Verify Google ID token
 */
export async function verifyGoogleIdToken(token: string): Promise<{
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}> {
  try {
    // Verify token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    // Get payload
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google ID token');
    }
    
    // Extract user info
    const { sub: googleId, email, name, picture } = payload;
    
    // Validate email
    if (!email) {
      throw new Error('Email not provided by Google');
    }
    
    return {
      googleId,
      email,
      name: name || email.split('@')[0],
      picture,
    };
  } catch (error) {
    logger.error('Google ID token verification failed:', error);
    throw new Error('Failed to verify Google ID token');
  }
}