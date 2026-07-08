import { createApp } from './app';
import { prisma } from './db';
import { env } from './env';
import { PrismaRepository } from './repositories/prismaRepository';
import { createApiRouter } from './routes/api';

const app = createApp({
  routes: [
    createApiRouter({
      repository: new PrismaRepository(prisma),
      jwtSecret: env.JWT_SECRET,
    }),
  ],
});

app.listen(env.PORT, () => {
  console.log(`Mood Tracker API listening on http://localhost:${env.PORT}`);
});
