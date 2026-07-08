import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from './env';

export interface AppDependencies {
  routes?: RequestHandler[];
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : '服务器内部错误。';
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = express();

  app.use(cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true });
  });

  for (const route of dependencies.routes || []) {
    app.use('/api', route);
  }

  app.use(errorHandler);

  return app;
};
