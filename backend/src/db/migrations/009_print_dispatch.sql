ALTER TABLE print_jobs DROP CONSTRAINT print_jobs_kind_check;
ALTER TABLE print_jobs ADD CONSTRAINT print_jobs_kind_check CHECK(kind IN('receipt','return','invoice','labels','shift_report'));
ALTER TABLE print_jobs ADD COLUMN dispatch_terminal text CHECK(length(dispatch_terminal) BETWEEN 8 AND 100);
ALTER TABLE print_jobs ADD COLUMN dispatch_state text NOT NULL DEFAULT 'pending' CHECK(dispatch_state IN('pending','assigned','spooled','uncertain','confirmed_printed','cancelled_reviewed'));
CREATE INDEX print_dispatch_terminal ON print_jobs(company_id,dispatch_terminal,created_at DESC);
