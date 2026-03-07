-- Migration: Add Configure Mode tables to Realtime publication
-- Enables live cross-tab updates for product/process configuration

ALTER PUBLICATION supabase_realtime ADD TABLE part_numbers;
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE bom_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE routes;
ALTER PUBLICATION supabase_realtime ADD TABLE route_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE serial_algorithms;
