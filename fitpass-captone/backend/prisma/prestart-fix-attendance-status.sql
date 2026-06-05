UPDATE "Attendance"
SET "status" = 'PRESENT'
WHERE "status"::text = 'LATE';
