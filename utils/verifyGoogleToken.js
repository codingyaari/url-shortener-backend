import { OAuth2Client } from 'google-auth-library';

/**
 * Verify Google ID token and return user information
 * @param {string} idToken - Google ID token from client
 * @returns {Promise<Object>} - User information from verified token
 */
export const verifyGoogleToken = async (idToken) => {
  try {
    if (!idToken) {
      throw new Error('ID token is required');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const client = new OAuth2Client(clientId);

    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId, // Verify it was issued for our app
    });

    const payload = ticket.getPayload();

    // Verify required claims exist
    if (!payload.email || !payload.name) {
      throw new Error('Invalid token: missing required user information');
    }

    // Verify email is verified
    if (!payload.email_verified) {
      throw new Error('Email address not verified by Google');
    }

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub, // Google's unique user ID
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    if (error.message.includes('Token used too early') || 
        error.message.includes('Token expired') ||
        error.message.includes('invalid signature')) {
      throw new Error('Invalid or expired token');
    }
    throw error;
  }
};

