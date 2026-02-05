import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function participantRoutes(fastify: FastifyInstance) {
  fastify.get('/participants', async () => {
    return await prisma.participant.findMany({
      orderBy: { id: 'asc' }
    });
  });

  fastify.get('/participants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const participant = await prisma.participant.findUnique({
      where: { id: Number(id) },
    });
    if (!participant) {
      reply.code(404).send({ error: 'Participant not found' });
      return;
    }
    return participant;
  });

  fastify.post('/participants', async (request, reply) => {
    const data = request.body as any;
    // Remove id if it's 0 or undefined to let auto-increment work, 
    // unless we are importing data where we want specific IDs? 
    // Usually auto-increment is better for new items.
    // For migration, we might need a special import route.
    if (data.id === 0 || data.id === undefined) {
      delete data.id;
    }
    
    // Convert Blob/Bytes logic if needed. For now assuming strictly JSON compatible or relying on buffer handling if passed correctly.
    // In Dexie it was Blob. Prisma 'Bytes' expects Buffer or base64. 
    // The frontend will need to send base64 or multipart.
    
    const participant = await prisma.participant.create({ data });
    return participant;
  });

  fastify.put('/participants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    delete data.id; // Don't update ID
    
    return await prisma.participant.update({
      where: { id: Number(id) },
      data,
    });
  });

  fastify.delete('/participants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await prisma.participant.delete({
      where: { id: Number(id) },
    });
  });
  
  fastify.delete('/participants', async (request, reply) => {
    // Clear all
    return await prisma.participant.deleteMany({});
  });
}
