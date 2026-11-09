ALTER TABLE users ADD COLUMN phone text NOT NULL DEFAULT '' CHECK(length(phone)<=50);
