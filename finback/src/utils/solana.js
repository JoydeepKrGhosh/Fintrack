const {
  Connection,
  clusterApiUrl,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} = require('@solana/web3.js');
const { MEMO_PROGRAM_ID } = require('@solana/spl-memo');
require('dotenv').config();

const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY)));

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

async function storeOnSolana(hash) {
  console.log('🧾 Storing on Solana...');

  // 1. Airdrop 1 SOL to the wallet if needed (Devnet only)
  const balance = await connection.getBalance(payer.publicKey);
  if (balance < 1e7) { // Less than 0.01 SOL
    console.log('💸 Low balance. Requesting airdrop...');
    const sig = await connection.requestAirdrop(payer.publicKey, 1e9); // 1 SOL
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('✅ Airdrop complete.');
  }

  // 2. Create a Memo instruction
  const memoInstruction = {
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(hash),
  };
  

  // 3. Create and send the transaction
  const transaction = new Transaction().add(memoInstruction);

  const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
  console.log('✅ Transaction complete with signature:', signature);
  return signature;
}

module.exports = { storeOnSolana };
