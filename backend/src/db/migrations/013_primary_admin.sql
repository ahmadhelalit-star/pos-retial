ALTER TABLE users ADD COLUMN is_primary_admin boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN deleted_at timestamptz;

UPDATE users u SET is_primary_admin=true,active=true
FROM (SELECT DISTINCT ON(company_id) company_id,user_id FROM audit_logs
      WHERE action='system.bootstrap' AND user_id IS NOT NULL ORDER BY company_id,id) original
WHERE u.company_id=original.company_id AND u.id=original.user_id;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM companies c WHERE NOT EXISTS(SELECT 1 FROM users u WHERE u.company_id=c.id AND u.is_primary_admin)) THEN
    RAISE EXCEPTION 'The original administrator could not be identified from bootstrap history';
  END IF;
END $$;

CREATE UNIQUE INDEX one_primary_admin_per_company ON users(company_id) WHERE is_primary_admin;
ALTER TABLE users ADD CONSTRAINT primary_admin_active CHECK(NOT is_primary_admin OR (active AND deleted_at IS NULL));

CREATE FUNCTION protect_primary_admin() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF OLD.is_primary_admin AND (TG_OP='DELETE' OR NOT NEW.is_primary_admin OR NOT NEW.active OR NEW.deleted_at IS NOT NULL OR NEW.company_id<>OLD.company_id) THEN
    RAISE EXCEPTION 'The primary administrator is protected' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND NEW.is_primary_admin<>OLD.is_primary_admin THEN
    RAISE EXCEPTION 'The primary administrator identity cannot be changed' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_primary_admin BEFORE UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION protect_primary_admin();
