import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { UserConverter } from "../converters/index.js";
import type { UserModel } from "../models/index.js";

const SALT_ROUNDS = 12;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "7d";
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
}

export class AuthService {
  static async register(
    username: string,
    email: string,
    password: string,
  ): Promise<{ user: UserModel; token: string }> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const prismaUser = await prisma.user.create({
      data: { username, email, password: hashedPassword },
    });

    const user = UserConverter.toModel(prismaUser);
    const token = AuthService.generateToken(user);

    return { user, token };
  }

  static async login(
    email: string,
    password: string,
  ): Promise<{ user: UserModel; token: string }> {
    const prismaUser = await prisma.user.findUnique({ where: { email } });
    if (!prismaUser) {
      throw new Error("Invalid credentials");
    }

    const match = await bcrypt.compare(password, prismaUser.password);
    if (!match) {
      throw new Error("Invalid credentials");
    }

    const user = UserConverter.toModel(prismaUser);
    const token = AuthService.generateToken(user);

    return { user, token };
  }

  static generateToken(user: UserModel): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      username: user.username,
    };
    return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() } as jwt.SignOptions);
  }

  static verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  }

  static async getProfile(userId: string): Promise<UserModel> {
    const prismaUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return UserConverter.toModel(prismaUser);
  }
}
