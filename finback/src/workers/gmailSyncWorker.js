// const { google } = require('googleapis');
const axios = require('axios');
const prisma = require('../prisma-client');
const { getValidGmailClient } = require('../utils/gmailClient');
const { shouldIncludeGmail } = require('../utils/smartGmailFilter');
require('dotenv').config();

async function syncGmailForAllUsers() {
    const users = await prisma.user.findMany({
        where: { Token: { isNot: null } },
        include: { Token: true },
    });

    for (const user of users) {
        if (!user.lastGmailHistoryId) {
            console.log(`🆕 Initial sync for ${user.email} — no lastGmailHistoryId.`);

            const gmail = await getValidGmailClient(user.id);
            const { data: messagesList } = await gmail.users.messages.list({
                userId: 'me',
                q: 'newer_than:30d', // Fetch recent 30 days
                maxResults: 50
            });

            const messageIds = messagesList.messages?.map(m => m.id) || [];

            for (const id of messageIds) {
                const { data: fullMsg } = await gmail.users.messages.get({
                    userId: 'me',
                    id,
                    format: 'full'
                });

                const payload = fullMsg.payload;
                const headers = payload.headers;
                const senderHeader = headers.find(h => h.name === 'From');
                const senderInfo = senderHeader ? senderHeader.value : 'unknown';

                let bodyText = '';
                const parts = payload.parts || [];
                for (let part of parts) {
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                        bodyText = Buffer.from(part.body.data, 'base64').toString('utf8');
                        break;
                    }
                }

                if (bodyText && shouldIncludeGmail(bodyText)) {
                    await axios.post(`${process.env.BASE_URL}/api/extractTransaction`, {
                        rawText: bodyText,
                        sourceType: 'email',
                        senderInfo,
                        userId: user.id
                    });

                    console.log(`📧 [Initial Sync] Processed email from ${senderInfo} for user ${user.email}`);
                }
            }

            // Save current historyId to enable delta sync next time
            const { data: profile } = await gmail.users.getProfile({ userId: 'me' });
            await prisma.user.update({
                where: { id: user.id },
                data: { lastGmailHistoryId: profile.historyId.toString() }
            });

            console.log(`✅ Initial Gmail sync done for ${user.email}`);
            continue; // skip the usual delta-sync
        }

        try {
            const gmail = await getValidGmailClient(user.id);
            const { data: history } = await gmail.users.history.list({
                userId: 'me',
                startHistoryId: user.lastGmailHistoryId,
                historyTypes: ['messageAdded'],
            });

            const messageIds = [];
            history?.history?.forEach(h =>
                h.messages?.forEach(m => messageIds.push(m.id))
            );

            for (const id of messageIds) {
                const { data: fullMsg } = await gmail.users.messages.get({
                    userId: 'me',
                    id,
                    format: 'full',
                });

                const payload = fullMsg.payload;
                const headers = fullMsg.payload.headers;
                const senderHeader = headers.find(h => h.name === 'From');
                const senderInfo = senderHeader ? senderHeader.value : 'unknown';

                let bodyText = '';

                const parts = payload.parts || [];
                for (let part of parts) {
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                        bodyText = Buffer.from(part.body.data, 'base64').toString('utf8');
                        break;
                    }
                }

                if (bodyText && shouldIncludeGmail(bodyText)) {
                    await axios.post(`${process.env.BASE_URL}/api/transactions`, {
                        rawText: bodyText,
                        sourceType: 'email',
                        senderInfo,
                        userId: user.id,
                    });
                    console.log(`📧 Processed email from ${senderInfo} for user ${user.email}`);
                    console.log(bodyText);
                }
            }

            const { data: profile } = await gmail.users.getProfile({ userId: 'me' });
            await prisma.user.update({
                where: { id: user.id },
                data: { lastGmailHistoryId: profile.historyId.toString() },
            });

            console.log(`✅ Gmail sync completed for ${user.email}`);
        } catch (err) {
            console.error(`❌ Error syncing Gmail for ${user.email}:`, err);
        }
    }
}

module.exports = { syncGmailForAllUsers };
