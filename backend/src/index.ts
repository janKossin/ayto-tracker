import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';

const fastify: FastifyInstance = Fastify({ logger: true });
const prisma = new PrismaClient();

fastify.register(cors, {
  origin: '*', // Allow all origins for now (dev)
});

// Hello World
fastify.get('/', async () => {
  return { hello: 'world' };
});

import participantRoutes from './routes/participants';
import matchingNightRoutes from './routes/matchingNights';
import matchboxRoutes from './routes/matchboxes';
import penaltyRoutes from './routes/penalties';
import broadcastNoteRoutes from './routes/broadcastNotes';
import probabilityCacheRoutes from './routes/probabilityCache';
import importRoutes from './routes/import';
import metaRoutes from './routes/meta';

fastify.register(participantRoutes);
fastify.register(matchingNightRoutes);
fastify.register(matchboxRoutes);
fastify.register(penaltyRoutes);
fastify.register(broadcastNoteRoutes);
fastify.register(probabilityCacheRoutes);
fastify.register(importRoutes);
fastify.register(metaRoutes);


const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
