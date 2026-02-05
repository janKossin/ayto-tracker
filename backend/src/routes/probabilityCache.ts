import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function probabilityCacheRoutes(fastify: FastifyInstance) {
  fastify.get('/probability-cache', async (request) => {
    const query = request.query as { dataHash?: string };
    if (query.dataHash) {
        const cache = await prisma.probabilityCache.findFirst({
            where: { dataHash: query.dataHash }
        });
        if (!cache) return null; // or 404
        return cache;
    }
    return await prisma.probabilityCache.findMany();
  });

  fastify.post('/probability-cache', async (request, reply) => {
    const data = request.body as any;
    if (data.id === 0 || data.id === undefined) delete data.id;
    
    // Check existing
    const existing = await prisma.probabilityCache.findFirst({
        where: { dataHash: data.dataHash }
    });
    
    if (existing) {
        return await prisma.probabilityCache.update({
            where: { id: existing.id },
            data
        });
    }

    return await prisma.probabilityCache.create({ data });
  });

  fastify.delete('/probability-cache', async (request, reply) => {
      return await prisma.probabilityCache.deleteMany({});
  });
}
