import { PrismaClient } from '@prisma/client';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { hashSHA256 } from '../utils/crypto.util';
import { AppError } from '../errors/app.error';

const prisma = new PrismaClient();

export class AuthService {
  static async register(data: RegisterInput) {
    const normalizedEmail = data.email.toLowerCase().trim();

    return await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }

      const hashedPassword = await hashPassword(data.password);

      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.userName,
          email: normalizedEmail,
          passwordHash: hashedPassword,
          role: 'ADMIN',
          organizationId: organization.id,
        },
      });

      const accessToken = generateAccessToken({
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({ userId: user.id });
      const hashedRefreshToken = hashSHA256(refreshToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await tx.refreshToken.create({
        data: {
          tokenHash: hashedRefreshToken,
          userId: user.id,
          expiresAt: expiresAt,
        },
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    });
  }

  static async login(data: LoginInput) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await comparePassword(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({ userId: user.id });
    const hashedRefreshToken = hashSHA256(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        tokenHash: hashedRefreshToken,
        userId: user.id,
        expiresAt: expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  static async refresh(token: string) {
    try {
      const decoded = verifyRefreshToken(token);
      const tokenHash = hashSHA256(token);

      return await prisma.$transaction(async (tx) => {
        const storedToken = await tx.refreshToken.findUnique({
          where: { tokenHash },
        });

        if (!storedToken || storedToken.revoked) {
          throw new AppError('Invalid or revoked refresh token', 401);
        }

        if (storedToken.expiresAt < new Date()) {
          throw new AppError('Refresh token expired', 401);
        }

        // Revoke the old token
        await tx.refreshToken.update({
          where: { id: storedToken.id },
          data: { revoked: true },
        });

        const user = await tx.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          throw new AppError('User not found', 404);
        }

        const newAccessToken = generateAccessToken({
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role,
        });

        const newRefreshToken = generateRefreshToken({ userId: user.id });
        const newHashedRefreshToken = hashSHA256(newRefreshToken);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await tx.refreshToken.create({
          data: {
            tokenHash: newHashedRefreshToken,
            userId: user.id,
            expiresAt: expiresAt,
          },
        });

        return {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        };
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid refresh token', 401);
    }
  }

  static async logout(token: string) {
    const tokenHash = hashSHA256(token);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (storedToken && !storedToken.revoked) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });
    }
  }
}
