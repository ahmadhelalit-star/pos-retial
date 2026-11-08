DO $$ BEGIN
  EXECUTE format('ALTER FUNCTION post_stock_entry() SECURITY DEFINER SET search_path TO %I, pg_temp',current_schema());
END $$;
CREATE TABLE shift_events(company_id uuid NOT NULL, id uuid NOT NULL, shift_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN('closed','reopened')), reason text, snapshot jsonb NOT NULL, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,shift_id) REFERENCES shifts(company_id,id), FOREIGN KEY(company_id,created_by) REFERENCES users(company_id,id));
CREATE TRIGGER immutable_shift_events BEFORE UPDATE OR DELETE ON shift_events FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
