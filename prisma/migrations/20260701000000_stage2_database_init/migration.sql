-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "lottery_prizes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "probability_weight" INTEGER NOT NULL DEFAULT 1,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lottery_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lottery_winner" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "prize_name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "won_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lottery_winner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lottery_prizes_tier_idx" ON "lottery_prizes"("tier");

-- CreateIndex
CREATE INDEX "lottery_winner_won_at_idx" ON "lottery_winner"("won_at" DESC);
