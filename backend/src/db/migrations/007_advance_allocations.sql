ALTER TABLE payment_allocations DROP CONSTRAINT payment_allocations_pkey;
ALTER TABLE payment_allocations ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE payment_allocations ADD PRIMARY KEY(id);
CREATE INDEX allocation_invoice ON payment_allocations(company_id,document_id);
CREATE INDEX allocation_payment ON payment_allocations(company_id,payment_id);
CREATE TABLE allocation_events(company_id uuid NOT NULL, id uuid NOT NULL, payment_id uuid NOT NULL, fx_base numeric(24,9) NOT NULL, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,payment_id) REFERENCES payments(company_id,id), FOREIGN KEY(company_id,created_by) REFERENCES users(company_id,id));
CREATE TRIGGER immutable_allocation_events BEFORE UPDATE OR DELETE ON allocation_events FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
