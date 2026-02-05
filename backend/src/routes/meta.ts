import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function metaRoutes(fastify: FastifyInstance) {
  fastify.get('/meta/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const meta = await prisma.meta.findUnique({
      where: { key }
    });
    return meta ? { value: meta.value } : { value: null };
  });

  fastify.post('/meta', async (request, reply) => {
    const { key, value } = request.body as { key: string; value: string };
    const meta = await prisma.meta.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    return meta;
  });
}
