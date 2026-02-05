
import { PrismaClient } from '@prisma/client';

/**
 * Resets the auto-increment sequences for all tables to the max(id) + 1.
 * This prevents unique constraint errors after importing data with explicit IDs.
 */
export async function resetTableSequences(prisma: PrismaClient) {
  const tables = [
    'Participant',
    'MatchingNight',
    'Matchbox',
    'Penalty',
    'BroadcastNote',
    'ProbabilityCache'
  ];

  console.log('🔄 Resetting database sequences...');
  
  for (const table of tables) {
    try {
      // Postgres specific syntax to reset sequence
      // We need to quote the table name because Prisma uses PascalCase but Postgres defaults to lowercase if unquoted
      // However, Prisma maps models to table names. Let's assume standard casing.
      // The query sets the sequence to the maximum id present in the table + 1.
      await prisma.$executeRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id)+1, 1), false) FROM "${table}";
      `);
      console.log(`✅ Sequence reset for table: ${table}`);
    } catch (error) {
      console.warn(`⚠️ Failed to reset sequence for table ${table}:`, error);
    }
  }
  
  console.log('✨ All sequences reset.');
}
