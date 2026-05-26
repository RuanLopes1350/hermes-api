ALTER TABLE "template" ADD COLUMN "creator_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "global" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;