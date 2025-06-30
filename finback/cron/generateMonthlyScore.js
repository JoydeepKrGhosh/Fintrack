// cronJobs/generateMonthlyScore.js

const { getAllUsersFinancialData } = require('../src/service/Financial_Score/financialAggregator.js');
const { calculateFinancialScore } = require('../src/service/Financial_Score/scoreCalculator.js');
console.log("🔍 DEBUG: typeof calculateFinancialScore =", typeof calculateFinancialScore);
const { storeFinancialSnapshot } = require('../src/service/Financial_Score/snapshotWriter.js');
const { startOfMonth, endOfMonth, subMonths } = require('date-fns');

const MAX_CONCURRENT_USERS = 5; // Rate-limiting for parallelization
let limit;

// Dynamically load p-limit at runtime
async function setupPLimit() {
  const pLimitModule = await import('p-limit');
  limit = pLimitModule.default(MAX_CONCURRENT_USERS);
}

async function generateMonthlyScores(monthOffset = 1) {
  console.log('🚀 generateMonthlyScores started with offset:', monthOffset);
  const now = new Date();
  const targetMonth = subMonths(now, monthOffset); // Configurable offset
  const periodStart = startOfMonth(targetMonth);
  const periodEnd = endOfMonth(targetMonth);

  console.log(`🔁 Generating scores for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  let successCount = 0;
  let failureCount = 0;
  let totalCount = 0;

  await setupPLimit(); // Ensure `limit` is ready before usage

  const usersData = await getAllUsersFinancialData(periodStart, periodEnd);
  console.log(`🔍 Retrieved ${usersData.length} users with data`);

  totalCount = usersData.length;

  const tasks = usersData.map((userData, index) =>
    limit(async () => {
      const { userId, rawData } = userData;
      try {
        const { score, explanation } = calculateFinancialScore(rawData);

        await storeFinancialSnapshot({
          userId,
          financialScore: score,
          rawData,
          periodStart,
          periodEnd,
        });

        successCount++;
        console.log(`✅ [${index + 1}/${totalCount}] Stored score for user ${userId}: ${score}`);
      } catch (err) {
        failureCount++;
        console.error(`❌ [${index + 1}/${totalCount}] Failed for user ${userId}:`, err);
      }
    })
  );

  await Promise.all(tasks);

  console.log(`\n📊 Monthly Score Job Summary`);
  console.log(`--------------------------`);
  console.log(`Total users processed: ${totalCount}`);
  console.log(`✅ Successes: ${successCount}`);
  console.log(`❌ Failures: ${failureCount}`);
}

module.exports = generateMonthlyScores;

if (require.main === module) {
  console.log('✅ Script is being run directly');
  console.log('🧪 Arguments:', process.argv);

  const offsetArg = parseInt(process.argv[2]) || 1;
  console.log('📆 Offset parsed:', offsetArg);

  generateMonthlyScores(offsetArg)
    .then(() => console.log('✅ Monthly score generation complete'))
    .catch(err => console.error('❌ Fatal error generating scores:', err));
}
