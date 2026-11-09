ALTER TABLE categories ADD COLUMN sort_position integer NOT NULL DEFAULT 2147483647;
WITH positions AS (
 SELECT company_id,id,(row_number() OVER(PARTITION BY company_id ORDER BY lower(name),id)-1)::integer position FROM categories
)
UPDATE categories c SET sort_position=p.position FROM positions p WHERE p.company_id=c.company_id AND p.id=c.id;
