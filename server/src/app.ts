import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from './env';

export interface AppDependencies {
  routes?: RequestHandler[];
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error('[mood-tracker] Unhandled server error:', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器暂时无法处理请求，请稍后再试。',
    },
  });
};

const allowedOrigins = env.CLIENT_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
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
