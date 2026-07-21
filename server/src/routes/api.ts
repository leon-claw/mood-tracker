import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createCaptchaChallenge, generateCaptchaText, verifyCaptchaAnswer } from '../lib/captcha';
import { comparePassword, hashPassword } from '../lib/password';
import { clearSessionCookie, createRequireAuth, setSessionCookie, signSessionToken, AuthenticatedRequest } from '../lib/session';
import { createExportEnvelope, normalizeSyncData, parseImportEnvelope } from '../domain/portableData';
import { sanitizeServerLogValues } from '../domain/logValues';
import { AppRepository, UserRecord } from '../repositories/types';
import {
  MAX_REMINDER_TIMES,
  normalizeAppPreferences,
  RECORD_FIELD_IDS,
} from '../../../shared/appPreferences';

interface ApiRouterDependencies {
  repository: AppRepository;
  jwtSecret: string;
  captchaTextFactory?: () => string;
}

const AUTH_MODE_HEADER = 'x-mood-tracker-auth';

const emailSchema = z.string().email().transform((email) => email.trim().toLowerCase());
const passwordSchema = z.string().min(8);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const valuesSchema = z.record(z.string(), z.unknown());

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  captchaId: z.string().min(1),
  captchaText: z.string().min(1),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

const entrySchema = z.object({
  date: dateSchema,
  values: valuesSchema,
});

const monthSchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/);
const yearSchema = z.coerce.number().int().min(2000).max(2100);
const entryChangeSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('upsert'), date: dateSchema, values: valuesSchema }),
  z.object({ operation: z.literal('delete'), date: dateSchema }),
]);

const stateSchema = z.object({
  points: z.number().optional().default(0),
  unlockedItems: z.array(z.string()).optional().default([]),
  isPremiumUnlocked: z.boolean().optional().default(false),
});

const preferencesSchema = z.object({
  enabledRecordFieldIds: z.array(z.enum(RECORD_FIELD_IDS)).min(1),
  reminders: z.object({
    enabled: z.boolean(),
    times: z.array(z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)).max(MAX_REMINDER_TIMES),
  }).optional(),
});

const changesSchema = z.object({
  entries: z.array(entryChangeSchema).max(62).optional().default([]),
  userState: stateSchema.optional(),
  preferences: preferencesSchema.optional(),
}).refine(
  (value) => value.entries.length > 0 || value.userState !== undefined || value.preferences !== undefined,
  { message: '没有需要同步的修改。' }
);

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

const sendUser = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
});

const wantsBearerAuth = (request: Request) =>
  request.header(AUTH_MODE_HEADER)?.toLowerCase() === 'bearer';

const sendAuthenticatedUser = (request: Request, response: Response, user: UserRecord, token: string) => {
  if (wantsBearerAuth(request)) {
    response.json({ user: sendUser(user), token });
    return;
  }

  setSessionCookie(response, token);
  response.json({ user: sendUser(user) });
};

const asyncHandler = (
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
) => (request: Request, response: Response, next: NextFunction) => {
  handler(request, response, next).catch(next);
};

const parseBody = <Schema extends z.ZodTypeAny>(schema: Schema, value: unknown): z.infer<Schema> => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', '请求内容不完整，请检查后再试。');
  }
  return result.data;
};

const requireCurrentUser = async (request: AuthenticatedRequest, repository: AppRepository) => {
  const sessionUser = request.user;
  if (!sessionUser) {
    throw new ApiError(401, 'UNAUTHENTICATED', '请先登录。');
  }

  const user = await repository.findUserById(sessionUser.userId);
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', '登录已失效，请重新登录。');
  }
  return user;
};

export const createApiRouter = ({
  repository,
  jwtSecret,
  captchaTextFactory = generateCaptchaText,
}: ApiRouterDependencies) => {
  const router = Router();
  const requireAuth = createRequireAuth(jwtSecret);

  router.get('/captcha', asyncHandler(async (_request, response) => {
    const challenge = await createCaptchaChallenge(captchaTextFactory());
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const captcha = await repository.createCaptcha(challenge.answerHash, expiresAt);

    response.json({
      captchaId: captcha.id,
      svg: challenge.svg,
      expiresAt: captcha.expiresAt.toISOString(),
    });
  }));

  router.post('/auth/register', asyncHandler(async (request, response) => {
    const body = parseBody(registerSchema, request.body);
    const captcha = await repository.findCaptcha(body.captchaId);
    const captchaExpired = !captcha || captcha.usedAt || captcha.expiresAt.getTime() < Date.now();

    if (captchaExpired || !(await verifyCaptchaAnswer(body.captchaText, captcha.answerHash))) {
      throw new ApiError(400, 'INVALID_CAPTCHA', '验证码不正确或已过期。');
    }

    const existingUser = await repository.findUserByEmail(body.email);
    if (existingUser) {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', '这个邮箱已经注册过了。');
    }

    await repository.markCaptchaUsed(captcha.id);
    const passwordHash = await hashPassword(body.password);
    const user = await repository.createUser(body.email, passwordHash);
    const token = signSessionToken({ userId: user.id, email: user.email }, jwtSecret);
    sendAuthenticatedUser(request, response, user, token);
  }));

  router.post('/auth/login', asyncHandler(async (request, response) => {
    const body = parseBody(loginSchema, request.body);
    const user = await repository.findUserByEmail(body.email);
    const passwordMatches = user ? await comparePassword(body.password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', '邮箱或密码不正确。');
    }

    const token = signSessionToken({ userId: user.id, email: user.email }, jwtSecret);
    sendAuthenticatedUser(request, response, user, token);
  }));

  router.post('/auth/logout', (request, response) => {
    if (!wantsBearerAuth(request)) {
      clearSessionCookie(response);
    }
    response.json({ ok: true });
  });

  router.get('/me', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    response.json({ user: sendUser(user) });
  }));

  router.patch('/me/password', requireAuth, asyncHandler(async (request, response) => {
    const body = parseBody(passwordChangeSchema, request.body);
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);

    if (!(await comparePassword(body.currentPassword, user.passwordHash))) {
      throw new ApiError(400, 'INVALID_PASSWORD', '当前密码不正确。');
    }

    await repository.updatePassword(user.id, await hashPassword(body.newPassword));
    response.json({ ok: true });
  }));

  router.get('/sync', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    response.json(await repository.getSyncData(user.id));
  }));

  router.get('/bootstrap', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    response.json(await repository.getBootstrapData(user.id));
  }));

  router.put('/sync', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    const data = normalizeSyncData(request.body);
    response.json(await repository.replaceSyncData(user.id, data));
  }));

  router.get('/entries', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    const month = parseBody(monthSchema, request.query.month);
    const [year, monthNumber] = month.split('-').map(Number);
    response.json({ entries: await repository.getEntriesByMonth(user.id, year, monthNumber) });
  }));

  router.get('/entry-months', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    response.json({ months: await repository.getEntryMonths(user.id) });
  }));

  router.get('/reports/yearly', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    const year = parseBody(yearSchema, request.query.year);
    response.json(await repository.getYearlyReport(user.id, year));
  }));

  router.post('/entries', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    const body = parseBody(entrySchema, request.body);
    const entry = await repository.upsertEntry(user.id, body.date, sanitizeServerLogValues(body.values));
    response.json({ entry });
  }));

  router.delete('/entries/:id', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    await repository.deleteEntry(user.id, request.params.id);
    response.json({ ok: true });
  }));

  router.post('/changes', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    const changes = parseBody(changesSchema, request.body);
    const changedEntries = [];
    const deletedDates: string[] = [];

    for (const change of changes.entries) {
      if (change.operation === 'delete') {
        await repository.deleteEntryByDate(user.id, change.date);
        deletedDates.push(change.date);
      } else {
        changedEntries.push(await repository.upsertEntry(
          user.id,
          change.date,
          sanitizeServerLogValues(change.values)
        ));
      }
    }

    if (changes.userState) await repository.updateUserState(user.id, changes.userState);
    if (changes.preferences) {
      await repository.updatePreferences(user.id, normalizeAppPreferences(changes.preferences));
    }

    response.json({
      entries: changedEntries,
      deletedDates,
      bootstrap: changes.userState || changes.preferences
        ? await repository.getBootstrapData(user.id)
        : undefined,
    });
  }));

  router.put('/user-state', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    const body = parseBody(stateSchema, request.body);
    response.json(await repository.updateUserState(user.id, body));
  }));

  router.put('/preferences', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    const preferences = normalizeAppPreferences(parseBody(preferencesSchema, request.body));
    response.json({ preferences: await repository.updatePreferences(user.id, preferences) });
  }));

  router.get('/export', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    response.json(createExportEnvelope(await repository.getSyncData(user.id)));
  }));

  router.post('/import', requireAuth, asyncHandler(async (request, response) => {
    const user = await requireCurrentUser(request as AuthenticatedRequest, repository);
    response.json(await repository.replaceSyncData(user.id, parseImportEnvelope(request.body)));
  }));

  router.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ApiError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    next(error);
  });

  return router;
};
