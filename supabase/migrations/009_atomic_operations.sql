-- Migration 009: Atomic RPC functions for concurrent-safe operations
-- Fixes race conditions in serial counter increment and order completion tracking.

-- Atomically increment serial counter and return the new value.
-- Used by generate_units to avoid duplicate serial numbers under concurrent calls.
CREATE OR REPLACE FUNCTION increment_serial_counter(algo_id UUID, increment INT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_counter INT;
BEGIN
  UPDATE serial_algorithms
  SET current_counter = current_counter + increment
  WHERE id = algo_id
  RETURNING current_counter INTO new_counter;
  RETURN new_counter;
END;
$$;

-- Atomically increment quantity_completed on a production order.
-- Auto-transitions status to 'complete' when quantity_completed >= quantity_ordered.
CREATE OR REPLACE FUNCTION increment_order_completed(p_order_id UUID)
RETURNS TABLE(new_completed INT, ordered INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE production_orders
  SET quantity_completed = production_orders.quantity_completed + 1,
      status = CASE
        WHEN production_orders.quantity_completed + 1 >= production_orders.quantity_ordered
        THEN 'complete'::production_order_status
        ELSE production_orders.status
      END
  WHERE id = p_order_id
  RETURNING production_orders.quantity_completed, production_orders.quantity_ordered;
END;
$$;
