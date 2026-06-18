CREATE TABLE "template_log" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"actor_id" text,
	"action" varchar NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_log" ADD CONSTRAINT "template_log_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_log" ADD CONSTRAINT "template_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;