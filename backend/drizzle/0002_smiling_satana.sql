ALTER TABLE "jobs" RENAME COLUMN "admin_id" TO "added_by";--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_admin_id_admins_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_added_by_admins_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;