const { getValidGmailClient } = require('../utils/gmailClient');

exports.fetchGmailTransactions = async (req, res) => {
    try {
        const userId = req.user.userId; // Extracted from JWT
        const gmail = await getValidGmailClient(userId);

        const { data } = await gmail.users.messages.list({
            userId: 'me',
            q: 'subject:(transaction) OR subject:(credited) OR subject:(debited)',
            maxResults: 10,
        });

        return res.json({ messages: data.messages || [] });
    } catch (err) {
        console.error('Failed to fetch Gmail transactions:', err);
        return res.status(500).json({ error: 'Failed to fetch Gmail transactions' });
    }
};
