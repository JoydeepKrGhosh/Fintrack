const { google } = require('googleapis');
const prisma = require('../prisma-client');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_SECRET
);

/**
 * Returns a Gmail client with auto-refresh handled
 * @param {string} userId - Your app's user ID
 */
async function getValidGmailClient(userId) {
    const tokenData = await prisma.token.findUnique({ where: { userId } });

    if (!tokenData) throw new Error('Token data not found');

    oauth2Client.setCredentials({
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
    });

    // Check if access token has expired
    const now = Date.now();
    if (now > Number(tokenData.accessTokenExpiry)) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        // Update new tokens in DB
        await prisma.token.update({
            where: { userId },
            data: {
                accessToken: credentials.access_token,
                accessTokenExpiry: BigInt(credentials.expiry_date || now + 3600 * 1000),
            },
        });
    }

    return google.gmail({ version: 'v1', auth: oauth2Client });
}

module.exports = { getValidGmailClient };
