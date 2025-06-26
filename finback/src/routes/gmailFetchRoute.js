const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const router = express.Router();
const { syncGmailForAllUsers } = require('../workers/gmailSyncWorker');


router.get('/test-gmail-sync', authMiddleware, async (req, res) => {
    try {
        await syncGmailForAllUsers();
        res.status(200).json({ message: '✅ Gmail sync triggered manually.' });
    } catch (err) {
        console.error('❌ Manual sync failed:', err);
        res.status(500).json({ error: 'Manual sync failed.' });
    }
});

module.exports = router;