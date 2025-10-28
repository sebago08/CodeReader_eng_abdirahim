-- Run this in Supabase SQL Editor to clear old sessions
-- This will log everyone out, but fix the "Failed to deserialize" error

DELETE FROM sessions;

-- Verify sessions are cleared
SELECT COUNT(*) as session_count FROM sessions;
