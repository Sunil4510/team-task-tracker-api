import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRATION || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRATION || '7d';

export interface AccessTokenPayload {
  userId: string;
  organizationId: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti?: string;
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN as any });
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  const tokenPayload = { ...payload, jti: crypto.randomUUID() };
  return jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN as any });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
};
