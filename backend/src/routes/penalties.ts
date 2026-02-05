import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function penaltyRoutes(fastify: FastifyInstance) {
  fastify.get('/penalties', async () => {
    return await prisma.penalty.findMany({
      orderBy: { date: 'desc' }
    });
  });

  fastify.post('/penalties', async (request, reply) => {
    const data = request.body as any;
    if (data.id === 0 || data.id === undefined) delete data.id;
    return await prisma.penalty.create({ data });
  });

  fastify.put('/penalties/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    delete data.id;
    return await prisma.penalty.update({
      where: { id: Number(id) },
      data,
    });
  });

  fastify.delete('/penalties/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await prisma.penalty.delete({
      where: { id: Number(id) },
    });
  });

  fastify.delete('/penalties', async (request, reply) => {
      return await prisma.penalty.deleteMany({});
  });
}
