import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function broadcastNoteRoutes(fastify: FastifyInstance) {
  fastify.get('/broadcast-notes', async () => {
    return await prisma.broadcastNote.findMany({
      orderBy: { date: 'desc' }
    });
  });

  fastify.post('/broadcast-notes', async (request, reply) => {
    const data = request.body as any;
    if (data.id === 0 || data.id === undefined) delete data.id;
    
    // Check if date exists (upsert logic often used here)
    const existing = await prisma.broadcastNote.findUnique({
        where: { date: data.date }
    });
    
    if (existing) {
        return await prisma.broadcastNote.update({
            where: { id: existing.id },
            data
        });
    }
    
    return await prisma.broadcastNote.create({ data });
  });

  fastify.put('/broadcast-notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    delete data.id;
    
    return await prisma.broadcastNote.update({
      where: { id: Number(id) },
      data,
    });
  });

  fastify.delete('/broadcast-notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await prisma.broadcastNote.delete({
      where: { id: Number(id) },
    });
  });

  fastify.delete('/broadcast-notes', async (request, reply) => {
      return await prisma.broadcastNote.deleteMany({});
  });
}
