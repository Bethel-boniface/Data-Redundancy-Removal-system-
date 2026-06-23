const pool = require('../src/config/database');
const logger = require('../src/config/logger');
const DeduplicationService = require('../src/services/deduplicationService');

async function seed() {
  const client = await pool.connect();

  try {
    logger.info('Starting database seeding...');

    // Sample data for testing
    const sampleData = [
      {
        content: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          age: 30,
          location: 'New York',
        },
        metadata: {
          source: 'web_form',
          campaign: 'early_access',
        },
      },
      {
        content: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          age: 28,
          location: 'San Francisco',
        },
        metadata: {
          source: 'mobile_app',
          campaign: 'user_referral',
        },
      },
      {
        content: {
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          age: 35,
          location: 'Chicago',
        },
        metadata: {
          source: 'api',
          campaign: 'partner_integration',
        },
      },
      {
        content: {
          name: 'Alice Williams',
          email: 'alice.williams@example.com',
          age: 32,
          location: 'Boston',
        },
        metadata: {
          source: 'web_form',
          campaign: 'seasonal_promotion',
        },
      },
      {
        content: {
          name: 'Charlie Brown',
          email: 'charlie.brown@example.com',
          age: 29,
          location: 'Los Angeles',
        },
        metadata: {
          source: 'social_media',
          campaign: 'influencer_partnership',
        },
      },
    ];

    logger.info('Adding sample data to database...');

    const results = await DeduplicationService.bulkAddData(sampleData);

    logger.info(
      {
        successful: results.successful.length,
        failed: results.failed.length,
      },
      'Seeding completed'
    );

    console.log('\n=== Seeding Results ===');
    console.log(`✓ Successfully added: ${results.successful.length}`);
    console.log(`✗ Failed: ${results.failed.length}`);
    console.log(`⚠ Duplicates found: ${results.duplicates.length}`);
    console.log(`⚠ False positives: ${results.falsePositives.length}`);
  } catch (error) {
    logger.error({ error }, 'Database seeding failed');
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
