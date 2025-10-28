-- SQL to create progress tracker tables in Supabase production database
-- Run this in your Supabase SQL Editor

-- Create progress_trackers table
CREATE TABLE IF NOT EXISTS progress_trackers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL,
  work_plan_id VARCHAR,
  name VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for progress_trackers
CREATE INDEX IF NOT EXISTS progress_trackers_project_idx ON progress_trackers(project_id);
CREATE INDEX IF NOT EXISTS progress_trackers_work_plan_idx ON progress_trackers(work_plan_id);

-- Create progress_tracker_items table
CREATE TABLE IF NOT EXISTS progress_tracker_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_tracker_id VARCHAR NOT NULL,
  project_id VARCHAR NOT NULL,
  activity_id VARCHAR,
  item_type VARCHAR NOT NULL DEFAULT 'activity',
  description VARCHAR NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  qty_in_boq NUMERIC(15, 2) DEFAULT 0,
  qty_done NUMERIC(15, 2) DEFAULT 0,
  weighted_ratio NUMERIC(10, 4) DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for progress_tracker_items
CREATE INDEX IF NOT EXISTS progress_tracker_items_tracker_idx ON progress_tracker_items(progress_tracker_id);
CREATE INDEX IF NOT EXISTS progress_tracker_items_project_idx ON progress_tracker_items(project_id);

-- Verify tables were created
SELECT 'progress_trackers' as table_name, COUNT(*) as row_count FROM progress_trackers
UNION ALL
SELECT 'progress_tracker_items' as table_name, COUNT(*) as row_count FROM progress_tracker_items;
