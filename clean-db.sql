-- Clean invalid records from database
-- Run this with: psql -U postgres -d aiqa -f clean-db.sql

-- Option 1: Delete only invalid records (safer, keeps valid data)
DELETE FROM messages WHERE "conversationId" IS NULL;
DELETE FROM conversations WHERE "pdfId" IS NULL;
DELETE FROM pdfs WHERE id IS NULL;

-- Option 2: Drop all tables and start fresh (uncomment if you want to start over)
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;
-- DROP TABLE IF EXISTS scores CASCADE;
-- DROP TABLE IF EXISTS pdfs CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

SELECT 'Database cleaned successfully' AS status;



