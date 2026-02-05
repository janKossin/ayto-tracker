import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function matchboxRoutes(fastify: FastifyInstance) {
  fastify.get('/matchboxes', async () => {
    return await prisma.matchbox.findMany({
      orderBy: { createdAt: 'desc' }
    });
  });

  fastify.post('/matchboxes', async (request, reply) => {
    try {
      const data = request.body as any;
      if (data.id === 0 || data.id === undefined) delete data.id;
      
      console.log('📝 Creating matchbox with data:', JSON.stringify(data, null, 2));
      
      const result = await prisma.matchbox.create({ data });
      return result;
    } catch (error) {
      console.error('❌ Error creating matchbox:', error);
      reply.code(500).send({ 
        error: 'Failed to create matchbox',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  fastify.put('/matchboxes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    delete data.id;
    return await prisma.matchbox.update({
      where: { id: Number(id) },
      data,
    });
  });

  fastify.delete('/matchboxes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await prisma.matchbox.delete({
      where: { id: Number(id) },
    });
  });

  fastify.delete('/matchboxes', async (request, reply) => {
      return await prisma.matchbox.deleteMany({});
  });
}
