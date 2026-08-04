DO $$ BEGIN
 CREATE TYPE "public"."system_role_enum" AS ENUM('super_admin', 'admin', 'user');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "system_role_enum" DEFAULT 'user' NOT NULL;
--> statement-breakpoint
-- Migrate existing data
UPDATE "user" SET "role" = 'super_admin' WHERE "is_admin" = true;
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "is_admin";
