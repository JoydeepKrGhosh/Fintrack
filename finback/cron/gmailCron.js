const cron = require('node-cron');
const { syncGmailForAllUsers } = require('../src/workers/gmailSyncWorker');

cron.schedule('0 */12 * * *', async () => {
    console.log('⏰ Gmail sync started...');
    await syncGmailForAllUsers();
});