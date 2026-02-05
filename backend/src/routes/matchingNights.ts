import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function matchingNightRoutes(fastify: FastifyInstance) {
  fastify.get('/matching-nights', async () => {
    return await prisma.matchingNight.findMany({
      orderBy: { date: 'asc' }
    });
  });

  fastify.post('/matching-nights', async (request, reply) => {
    const data = request.body as any;
    if (data.id === 0 || data.id === undefined) delete data.id;
    
    // JSON fields (pairs) are handled automatically by Prisma if the request body sends standard JSON array
    return await prisma.matchingNight.create({ data });
  });

  fastify.put('/matching-nights/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    delete data.id;
    
    return await prisma.matchingNight.update({
      where: { id: Number(id) },
      data,
    });
  });

  fastify.delete('/matching-nights/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await prisma.matchingNight.delete({
      where: { id: Number(id) },
    });
  });

  fastify.delete('/matching-nights', async (request, reply) => {
      return await prisma.matchingNight.deleteMany({});
  });
}
