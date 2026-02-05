import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function importRoutes(fastify: FastifyInstance) {
  fastify.post('/import', async (request, reply) => {
    const data = request.body as any;
    console.log('📥 Import request received. Keys:', Object.keys(data));
    
    try {
        const result = await prisma.$transaction(async (tx) => {
            let deleted = {};
            let imported = {
                participants: 0,
                matchingNights: 0,
                matchboxes: 0,
                penalties: 0,
                broadcastNotes: 0,
                probabilityCache: 0
            };

            if (data.clearBeforeImport) {
                console.log('🧹 Clearing database before import...');
                await tx.probabilityCache.deleteMany({});
                await tx.broadcastNote.deleteMany({});
                await tx.penalty.deleteMany({});
                await tx.matchbox.deleteMany({});
                await tx.matchingNight.deleteMany({});
                await tx.participant.deleteMany({});
                deleted = { success: true };
            }
            
            if (data.participants && Array.isArray(data.participants)) {
                console.log(`Processing ${data.participants.length} participants...`);
                for (const p of data.participants) {
                    // Prisma strict mode: remove unknown fields
                    // Participant fields based on schema:
                    // id, name, gender, status, active, knownFrom, age, photoUrl, source, bio, socialMediaAccount
                    // JSON might have extra fields that cause errors.
                    const { 
                        id, name, gender, status, active, knownFrom, age, 
                        photoUrl, source, bio, socialMediaAccount 
                    } = p;
                    
                    await tx.participant.create({ 
                        data: {
                             id, name, gender, status, active, knownFrom, age, 
                             photoUrl, source, bio, socialMediaAccount
                        }
                    });
                    imported.participants++;
                }
            }
            
            if (data.matchingNights && Array.isArray(data.matchingNights)) {
                console.log(`Processing ${data.matchingNights.length} matching nights...`);
                for (const item of data.matchingNights) {
                    // Filter fields
                    const { id, name, date, pairs, totalLights, ausstrahlungsdatum, ausstrahlungszeit } = item;
                    await tx.matchingNight.create({ 
                        data: { id, name, date, pairs, totalLights, ausstrahlungsdatum, ausstrahlungszeit } 
                    });
                    imported.matchingNights++;
                }
            }
            
            if (data.matchboxes && Array.isArray(data.matchboxes)) {
                console.log(`Processing ${data.matchboxes.length} matchboxes...`);
                for (const item of data.matchboxes) {
                     const { id, woman, man, matchType, price, buyer, soldDate, ausstrahlungsdatum, ausstrahlungszeit } = item;
                     await tx.matchbox.create({ 
                         data: { id, woman, man, matchType, price, buyer, soldDate, ausstrahlungsdatum, ausstrahlungszeit } 
                     });
                     imported.matchboxes++;
                }
            }

            if (data.penalties && Array.isArray(data.penalties)) {
                console.log(`Processing ${data.penalties.length} penalties...`);
                for (const item of data.penalties) {
                     const { id, participantName, reason, amount, date, description } = item;
                     await tx.penalty.create({ 
                         data: { id, participantName, reason, amount, date, description } 
                     });
                     imported.penalties++;
                }
            }
            
            // BroadcastNotes and Cache mostly strictly defined, assume fewer issues but apply similar pattern if needed
            
            return imported;
        });
        
        console.log('✅ Import successful:', result);
        return { success: true, stats: result };

    } catch (error) {
        console.error('❌ Import transaction failed:', error);
        // Return 500 but with error message
        reply.code(500).send({ 
            error: 'Import failed', 
            details: error instanceof Error ? error.message : String(error) 
        });
    }
  });
  
  fastify.get('/stats', async () => {
      const [p, m, mb, pen] = await Promise.all([
          prisma.participant.count(),
          prisma.matchingNight.count(),
          prisma.matchbox.count(),
          prisma.penalty.count()
      ]);
      return {
          participants: p,
          matchingNights: m,
          matchboxes: mb,
          penalties: pen
      };
  });
}
