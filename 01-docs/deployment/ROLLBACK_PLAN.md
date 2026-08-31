# Rollback Plan

1. Disable the affected frontend deployment and route traffic to the previous
   known-good build.
2. Roll back the backend service to the previous release image or commit.
3. Do not delete database data. Restore a database backup only after confirming
   schema compatibility and obtaining an operator approval.
4. Verify health, authentication, project listing, and workspace access.
5. Record the incident, deployment identifiers, and follow-up fix before retrying.
