-- The ledger is the only write path to balances. PostgreSQL numeric arithmetic is authoritative.
CREATE FUNCTION post_stock_entry() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p products; b stock_balances; negative_allowed boolean; new_cost numeric(24,9);
BEGIN
  SELECT * INTO STRICT p FROM products WHERE company_id=NEW.company_id AND id=NEW.product_id FOR UPDATE;
  IF p.type<>'stock' OR p.archived_at IS NOT NULL THEN RAISE EXCEPTION 'stock product required' USING ERRCODE='23514'; END IF;
  IF NOT p.allow_fractional AND (NEW.original_quantity<>trunc(NEW.original_quantity) OR NEW.quantity<>trunc(NEW.quantity)) THEN RAISE EXCEPTION 'fractional quantity not allowed' USING ERRCODE='23514'; END IF;
  IF NEW.variant_id='' AND EXISTS(SELECT 1 FROM product_variants WHERE company_id=NEW.company_id AND product_id=NEW.product_id AND id<>'') THEN RAISE EXCEPTION 'variant required' USING ERRCODE='23514'; END IF;
  INSERT INTO stock_balances(company_id,product_id,variant_id,warehouse_id) VALUES(NEW.company_id,NEW.product_id,NEW.variant_id,NEW.warehouse_id) ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT b FROM stock_balances WHERE company_id=NEW.company_id AND product_id=NEW.product_id AND variant_id=NEW.variant_id AND warehouse_id=NEW.warehouse_id FOR UPDATE;
  SELECT allow_negative_stock INTO negative_allowed FROM companies WHERE id=NEW.company_id;
  IF NOT negative_allowed AND b.quantity+NEW.quantity<0 THEN RAISE EXCEPTION 'insufficient stock' USING ERRCODE='23514'; END IF;
  new_cost:=b.average_cost;
  IF NEW.quantity>0 THEN
    IF b.quantity>0 THEN new_cost:=(b.quantity*b.average_cost+NEW.quantity*NEW.unit_cost)/(b.quantity+NEW.quantity);
    ELSE new_cost:=NEW.unit_cost; END IF;
  ELSE NEW.unit_cost:=b.average_cost; END IF;
  NEW.balance_after:=b.quantity+NEW.quantity;
  NEW.average_cost_after:=new_cost;
  UPDATE stock_balances SET quantity=NEW.balance_after,average_cost=new_cost WHERE company_id=NEW.company_id AND product_id=NEW.product_id AND variant_id=NEW.variant_id AND warehouse_id=NEW.warehouse_id;
  RETURN NEW;
END $$;
CREATE TRIGGER post_stock BEFORE INSERT ON stock_ledger FOR EACH ROW EXECUTE FUNCTION post_stock_entry();
CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable history' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_ledger BEFORE UPDATE OR DELETE ON stock_ledger FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE FUNCTION protect_balance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF pg_trigger_depth()<2 THEN RAISE EXCEPTION 'use stock ledger' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ledger_only_balance BEFORE INSERT OR UPDATE OR DELETE ON stock_balances FOR EACH ROW EXECUTE FUNCTION protect_balance();
