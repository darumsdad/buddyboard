-- Supabase-specific setup that cannot be managed by Drizzle migrations.
-- Run these statements once after `drizzle-kit push` on a fresh database,
-- in addition to the standard migration files.

-- Enable Realtime on the tables LiveBoard subscribes to (Phase 5).
-- pair_member INSERT events detect new pairs/trios being added.
-- pair DELETE events detect pair removal (cascade-deleted pair_member rows
-- do not fire their own Realtime events — this is why both tables are needed).
alter publication supabase_realtime add table pair;
alter publication supabase_realtime add table pair_member;

-- Required so that cascade deletes from pair → pair_member succeed when
-- pair_member is a member of the supabase_realtime publication.
-- Without this, Postgres raises:
--   "cannot delete from table pair_member because it does not have a
--    replica identity and publishes deletes"
alter table pair_member replica identity full;
