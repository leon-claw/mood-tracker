import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import type { Secret, SignOptions } from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'mood_tracker_session';

export interface SessionUser {
  userId: string;
  email: string;
}

interface SessionJwtPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

export const signSessionToken = (
  user: SessionUser,
  secret: Secret,
  expiresIn: SignOptions['expiresIn'] = '7d'
) =>
  jwt.sign({ email: user.email }, secret, {
    subject: user.userId,
    expiresIn,
  });

export const verifySessionToken = (token: string, secret: Secret): SessionUser | null => {
  try {
    const payload = jwt.verify(token, secret) as SessionJwtPayload;
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return {
      userId: payload.sub,
      email: payload.email,
    };
  } catch {
    return null;
  }
};

const isProduction = process.env.NODE_ENV === 'production';
const sameSiteMode = isProduction ? 'none' : 'lax';

const getBearerToken = (request: Request) => {
  const authorization = request.header('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
};

export const setSessionCookie = (response: Response, token: string) => {
  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: sameSiteMode,
    secure: isProduction,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearSessionCookie = (response: Response) => {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: sameSiteMode,
    secure: isProduction,
    path: '/',
  });
};

export const createRequireAuth = (secret: string) =>
  (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const token = request.cookies?.[SESSION_COOKIE_NAME] || getBearerToken(request);
    if (typeof token !== 'string') {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: '请先登录。' } });
      return;
    }

    const user = verifySessionToken(token, secret);
    if (!user) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: '登录已失效，请重新登录。' } });
      return;
    }

    request.user = user;
    next();
  };
