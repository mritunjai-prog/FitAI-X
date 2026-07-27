-- Grant advisory lock function access (needed by Prisma engine)
GRANT EXECUTE ON FUNCTION pg_advisory_lock(bigint) TO fitaix_user;
GRANT EXECUTE ON FUNCTION pg_advisory_unlock(bigint) TO fitaix_user;
GRANT EXECUTE ON FUNCTION pg_advisory_unlock_all() TO fitaix_user;
GRANT EXECUTE ON FUNCTION pg_try_advisory_lock(bigint) TO fitaix_user;

-- Grant access to pg_catalog functions Prisma uses
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO fitaix_user;
GRANT SELECT ON ALL TABLES IN SCHEMA pg_catalog TO fitaix_user;
