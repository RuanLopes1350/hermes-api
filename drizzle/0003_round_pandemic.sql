CREATE TYPE "public"."service_member_role_enum" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TABLE "service_member" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "service_member_role_enum" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_member_service_id_user_id_unique" UNIQUE("service_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "api_key" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "api_key" CASCADE;--> statement-breakpoint
ALTER TABLE "service" DROP CONSTRAINT "service_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "key_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "prefix" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "creator_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "service_member" ADD CONSTRAINT "service_member_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_member" ADD CONSTRAINT "service_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_key_hash_unique" UNIQUE("key_hash");--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "creator_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "global" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TYPE "public"."priority_enum" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "priority" "priority_enum" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "credential" DROP CONSTRAINT "credential_service_id_service_id_fk";--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_service_id_service_id_fk";--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_credential_id_credential_id_fk";--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_service_template_id_template_id_fk";--> statement-breakpoint
ALTER TABLE "service" DROP CONSTRAINT "service_creator_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "template" DROP CONSTRAINT "template_service_id_service_id_fk";--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_credential_id_credential_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credential"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_service_template_id_template_id_fk" FOREIGN KEY ("service_template_id") REFERENCES "public"."template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;