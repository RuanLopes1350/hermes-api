CREATE TYPE "public"."priority_enum" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
ALTER TABLE "api_key" DROP CONSTRAINT "api_key_service_id_service_id_fk";
--> statement-breakpoint
ALTER TABLE "api_key" DROP CONSTRAINT "api_key_credential_id_credential_id_fk";
--> statement-breakpoint
ALTER TABLE "credential" DROP CONSTRAINT "credential_service_id_service_id_fk";
--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_service_id_service_id_fk";
--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_credential_id_credential_id_fk";
--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_service_template_id_template_id_fk";
--> statement-breakpoint
ALTER TABLE "service" DROP CONSTRAINT "service_creator_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "service" DROP CONSTRAINT "service_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "template" DROP CONSTRAINT "template_service_id_service_id_fk";
--> statement-breakpoint
ALTER TABLE "template" DROP CONSTRAINT "template_creator_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "priority" "priority_enum" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_credential_id_credential_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credential"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_credential_id_credential_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credential"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_service_template_id_template_id_fk" FOREIGN KEY ("service_template_id") REFERENCES "public"."template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;