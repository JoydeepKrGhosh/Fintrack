const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma-client'); // Adjust path to your Prisma instance
require('dotenv').config();


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_WEB_CLIENT_SECRET,
);

exports.googleAuthController = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // 1. Exchange code for access + refresh tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token || !tokens.refresh_token) {
      return res.status(400).json({ error: 'Failed to retrieve access and refresh tokens' });
    }


    // 2. Fetch user profile info using Gmail OAuth
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    console.log('Google Profile:', profile);

    const { email, name, id: googleId } = profile;

    if (!email || !googleId) {
      return res.status(400).json({ error: 'Incomplete Google profile data' });
    }

    // 3. Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        googleId,
      },
      create: {
        email,
        name,
        googleId,
        mobileNumber: '9999999990', // Replace this as needed (use client-provided or generate)
      },
    });

    console.log('User Info:', user);
    if (!user) {
      return res.status(500).json({ error: 'Failed to create or update user' });
    }

    // 4. Store tokens in a separate table (Token model)
    await prisma.token.upsert({
      where: { userId: user.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiry: BigInt(Date.now() + (tokens.expires_in || 3600) * 1000),
      },
      create: {
        userId: user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiry: BigInt(Date.now() + (tokens.expires_in || 3600) * 1000),
      },
    });

    console.log('Tokens stored successfully');

    // 5. Issue your app's JWT
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({ token: jwtToken });
  } catch (err) {
    console.log('Google Sign-In error:', err);
    return res.status(500).json({ error: 'Google sign-in failed' });
  }
};
