-- Retire the Microsoft 365, Canvas LMS, and iCal subscription providers.
--
-- These providers were removed from the app in full. Rather than deleting the
-- connected_accounts rows (which would cascade-delete the user's already-synced
-- items and break the UNIQUE(user_id, provider, email) history), we mark the
-- accounts 'paused' so the sync dispatcher skips them going forward. The
-- underlying items stay intact; old data cleanup is intentionally deferred.
UPDATE connected_accounts
SET status = 'paused',
    error_message = 'This provider was retired and is no longer synced.'
WHERE provider IN ('microsoft', 'canvas', 'ical');
