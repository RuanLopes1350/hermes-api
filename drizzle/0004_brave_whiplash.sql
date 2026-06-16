CREATE TABLE "service_log" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"actor_id" text,
	"action" varchar NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_log" ADD CONSTRAINT "service_log_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_log" ADD CONSTRAINT "service_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_service_id_idx" ON "email" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "email_created_at_idx" ON "email" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_srv_status_del_idx" ON "email" USING btree ("service_id","status","deleted_at");