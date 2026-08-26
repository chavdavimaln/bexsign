# 17 — Email Workflow Architecture

## Email System Overview
- **Asynchronous Queue**: Uses an `email_queue` table processed by background worker.
- **Email Types (13 standard templates)**:
  1. Verification
  2. Welcome
  3. Password Reset
  4. Signature Request
  5. Reminder
  6. Document Completed
  7. Document Declined
  8. Document Expired
  9. Document Recalled
  10. Recipient Added
  11. Sequential Signing Notification
  12. Audit Certificate
  13. Delivery Failure
