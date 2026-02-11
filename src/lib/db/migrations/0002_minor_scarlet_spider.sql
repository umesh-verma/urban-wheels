ALTER TABLE "cg_rental_rental_reservations" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "cg_rental_cars" ADD COLUMN "location_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cg_rental_locations" ADD COLUMN "image_url" text;