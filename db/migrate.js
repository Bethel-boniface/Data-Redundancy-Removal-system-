const pool = require('../src/config/database');
const logger = require('../src/config/logger');

async function migrate() {
  const client = await pool.connect();

  try {
    logger.info('Starting database migration...');

    await client.query('BEGIN');

    // Create extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create data_entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        content JSONB NOT NULL,
        hash VARCHAR(255) NOT NULL UNIQUE,
        metadata JSONB,
        is_verified BOOLEAN DEFAULT false,
        is_duplicate BOOLEAN DEFAULT false,
        is_false_positive BOOLEAN DEFAULT false,
        original_data_id UUID REFERENCES data_entries(id) ON DELETE SET NULL,
        false_positive_reason VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255),
        updated_by VARCHAR(255)
      );
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_data_hash 
      ON data_entries(hash);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_data_is_verified 
      ON data_entries(is_verified);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_data_is_duplicate 
      ON data_entries(is_duplicate);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_data_is_false_positive 
      ON data_entries(is_false_positive);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_data_created_at 
      ON data_entries(created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_data_content 
      ON data_entries USING GIN (content);
    `);

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        data_id UUID REFERENCES data_entries(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        changes JSONB,
        performed_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_data_id 
      ON audit_logs(data_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
      ON audit_logs(created_at DESC);
    `);

    // Create statistics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS dedup_statistics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        total_entries BIGINT DEFAULT 0,
        verified_count BIGINT DEFAULT 0,
        duplicate_count BIGINT DEFAULT 0,
        false_positive_count BIGINT DEFAULT 0,
        valid_count BIGINT DEFAULT 0,
        redundancy_rate DECIMAL(5,2) DEFAULT 0.00,
        false_positive_rate DECIMAL(5,2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create function to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for data_entries
    await client.query(`
      DROP TRIGGER IF EXISTS update_data_entries_updated_at ON data_entries;
    `);

    await client.query(`
      CREATE TRIGGER update_data_entries_updated_at
      BEFORE UPDATE ON data_entries
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');

    logger.info('Database migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error }, 'Database migration failed');
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
