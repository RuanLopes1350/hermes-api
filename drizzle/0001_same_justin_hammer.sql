CREATE TYPE "public"."auth_type_enum" AS ENUM('plain', 'oauth2');--> statement-breakpoint
ALTER TABLE "credential" ALTER COLUMN "passkey" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_key" ADD COLUMN "credential_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "auth_type" "auth_type_enum" DEFAULT 'plain' NOT NULL;--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "client_id" text;--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "client_secret" text;--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_credential_id_credential_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credential"("id") ON DELETE no action ON UPDATE no action;