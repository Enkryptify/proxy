DO $$ BEGIN
 ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK (role IN ('user', 'admin'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
