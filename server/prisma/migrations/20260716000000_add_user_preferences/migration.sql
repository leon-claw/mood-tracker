ALTER TABLE "user_state"
ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';
