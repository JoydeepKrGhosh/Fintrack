const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require("@solana/web3.js");
require("dotenv").config();

// Load Solana wallet keypair
const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
const payer = Keypair.fromSecretKey(secretKey);

// Solana Connection
const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");

// Function to store transaction hash on Solana
const storeHashOnSolana = async (hash) => {
  try {
    const recipient = new PublicKey("Your_Solana_Wallet_Address"); // Replace with your Solana address
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: 0, // No SOL transfer, just a dummy transaction
      })
    );

    transaction.add(Buffer.from(hash, "hex")); // Attach hash as data
    const signature = await connection.sendTransaction(transaction, [payer]);

    console.log(`Transaction stored on Solana: ${signature}`);
    return signature;
  } catch (error) {
    console.error("Solana storage failed:", error);
    return null;
  }
};

module.exports = { storeHashOnSolana };
