import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = (password: string) =>
  bcrypt.hash(password, SALT_ROUNDS);

export const comparePassword = (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);
