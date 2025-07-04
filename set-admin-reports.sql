UPDATE "Report" SET "isPublic" = false WHERE "type" ILIKE '%demo%' OR "type" ILIKE '%import%' OR "type" ILIKE '%clean%' OR "type" ILIKE '%quality%' OR "type" ILIKE '%analysis%';
