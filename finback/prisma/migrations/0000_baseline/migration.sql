-- CreateEnum
CREATE TYPE "Occupation" AS ENUM ('Student', 'Retired', 'Self_Employed', 'Salaried', 'Freelancer', 'Other');

-- CreateEnum
CREATE TYPE "CityTier" AS ENUM ('Tier_1', 'Tier_2', 'Tier_3');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('UNDER_25', 'FROM_25_TO_40', 'FROM_40_TO_60', 'ABOVE_60');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('monthly', 'quarterly', 'yearly');

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtSimulation" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "debts" JSONB NOT NULL,
    "monthlyPayment" DECIMAL(12,2) NOT NULL,
    "avalancheResult" JSONB NOT NULL,
    "snowballResult" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "minimumPayment" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayingWithNeon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL,

    CONSTRAINT "PlayingWithNeon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionMetadata" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productDetails" TEXT,
    "transactionType" VARCHAR(10),
    "paymentMode" VARCHAR(20),
    "matchStatus" TEXT DEFAULT 'PENDING',
    "matchExpiresAt" TIMESTAMP(3),
    "isDebt" BOOLEAN DEFAULT false,
    "isSubscription" BOOLEAN DEFAULT false,
    "debtType" VARCHAR(30),
    "subscriptionType" VARCHAR(30),
    "interestRate" DECIMAL(5,2),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "extractedAmount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "sourceType" VARCHAR(10) NOT NULL,
    "sourceId" TEXT,
    "senderInfo" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "solanaTxHash" VARCHAR(64),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" INTEGER,
    "merchantId" INTEGER,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mobileNumber" CHAR(10) NOT NULL,
    "googleId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDebt" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "loanType" TEXT NOT NULL,
    "monthlyEmi" DOUBLE PRECISION NOT NULL,
    "outstandingAmount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialScoreSnapshot" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "financialScore" INTEGER NOT NULL,
    "savingsRate" DECIMAL(5,4) NOT NULL,
    "debtToIncomeRatio" DECIMAL(5,4) NOT NULL,
    "essNonEssRatio" DECIMAL(6,2) NOT NULL,
    "highExpenseFlag" BOOLEAN NOT NULL,
    "income" DECIMAL(12,2) NOT NULL,
    "disposableIncome" DECIMAL(12,2) NOT NULL,
    "essentialSpend" DECIMAL(10,2) NOT NULL,
    "nonEssentialSpend" DECIMAL(10,2) NOT NULL,
    "totalExpenses" DECIMAL(10,2) NOT NULL,
    "occupation" "Occupation" NOT NULL,
    "cityTier" "CityTier" NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "periodType" "PeriodType" NOT NULL DEFAULT 'monthly',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_name_key" ON "Merchant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_normalizedName_key" ON "Merchant"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionMetadata_transactionId_key" ON "TransactionMetadata"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_sourceId_key" ON "Transaction"("sourceId");

-- CreateIndex
CREATE INDEX "Transaction_userId_isProcessed_idx" ON "Transaction"("userId", "isProcessed");

-- CreateIndex
CREATE INDEX "Transaction_userId_transactionDate_idx" ON "Transaction"("userId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobileNumber_key" ON "User"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "FinancialScoreSnapshot_userId_idx" ON "FinancialScoreSnapshot"("userId");

-- CreateIndex
CREATE INDEX "FinancialScoreSnapshot_periodStart_periodEnd_idx" ON "FinancialScoreSnapshot"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "DebtSimulation" ADD CONSTRAINT "DebtSimulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionMetadata" ADD CONSTRAINT "TransactionMetadata_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDebt" ADD CONSTRAINT "UserDebt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialScoreSnapshot" ADD CONSTRAINT "FinancialScoreSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

