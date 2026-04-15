import { defineConfig } from 'prisma';

export default defineConfig({
  datasources: {
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL,
    },
  },
  generators: {
    client: {
      provider: 'prisma-client-js',
    },
  },
});