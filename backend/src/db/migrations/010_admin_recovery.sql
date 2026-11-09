CREATE TABLE admin_recovery_requests (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, user_id uuid NOT NULL,
 license_id uuid NOT NULL, fingerprint_hash text NOT NULL, fingerprint_source text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 consumed_at timestamptz, FOREIGN KEY(company_id,user_id) REFERENCES users(company_id,id)
);
CREATE INDEX admin_recovery_user ON admin_recovery_requests(user_id,created_at);
