-- ============================================================
-- Cost Monitoring Dashboard — Teardown Script
-- ============================================================
-- Removes everything created by setup.sql and snow app deploy.
-- Run as ACCOUNTADMIN.
-- ============================================================

USE ROLE ACCOUNTADMIN;

-- 1. Stop the refresh task
ALTER TASK IF EXISTS COST_DASHBOARD.PUBLIC.REFRESH_DAILY SUSPEND;

-- 2. Drop the SAR app (if deployed)
DROP APPLICATION SERVICE IF EXISTS COST_MONITORING_DASHBOARD;

-- 3. Drop the database (includes all tables, procedures, tasks)
DROP DATABASE IF EXISTS COST_DASHBOARD;

-- 4. Drop the warehouse
DROP WAREHOUSE IF EXISTS COST_DASHBOARD_WH;

-- Done — all objects removed.
