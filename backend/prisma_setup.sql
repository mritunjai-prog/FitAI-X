-- Create the _prisma_migrations table Prisma needs internally
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  id VARCHAR(36) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

GRANT ALL PRIVILEGES ON TABLE "_prisma_migrations" TO fitaix_user;
