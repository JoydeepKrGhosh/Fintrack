const { getValidGmailClient } = require('../utils/gmailClient');

exports.fetchGmailTransactions = async (req, res) => {
    try {
        const userId = req.user.userId; // Extracted from JWT
        const gmail = await getValidGmailClient(userId);

        // Step 1: Fetch message list (IDs only)
        const { data: messageList } = await gmail.users.messages.list({
            userId: 'me',
        });

        const messages = [];

        // Step 2: Fetch full content for each message
        for (const messageMeta of messageList.messages || []) {
            const { data: messageData } = await gmail.users.messages.get({
                userId: 'me',
                id: messageMeta.id,
                format: 'full',
            });

            const headers = messageData.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value || '';
            const from = headers.find(h => h.name === 'From')?.value || '';
            const date = headers.find(h => h.name === 'Date')?.value || '';
            const snippet = messageData.snippet || '';

            // Try to extract plain text body if available
            let body = '';
            const parts = messageData.payload.parts;
            if (parts && parts.length) {
                const textPart = parts.find(p => p.mimeType === 'text/plain');
                if (textPart?.body?.data) {
                    body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                }
            } else if (messageData.payload.body?.data) {
                body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
            }

            messages.push({
                id: messageData.id,
                threadId: messageData.threadId,
                subject,
                from,
                date,
                snippet,
                body,
            });
        }

        return res.json({ messages });
    } catch (err) {
        console.error('Failed to fetch Gmail transactions:', err);
        return res.status(500).json({ error: 'Failed to fetch Gmail transactions' });
    }
};
