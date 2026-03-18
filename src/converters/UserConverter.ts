import type { User as PrismaUser } from "../generated/prisma/client.js";
import { UserModel, UserWithPasswordModel } from "../models/index.js";

export class UserConverter {
  static toModel(prismaUser: PrismaUser): UserModel {
    return new UserModel(
      prismaUser.id,
      prismaUser.username,
      prismaUser.email,
      prismaUser.pixies,
      prismaUser.createdAt,
      prismaUser.updatedAt,
    );
  }

  static toModelWithPassword(prismaUser: PrismaUser): UserWithPasswordModel {
    return new UserWithPasswordModel(
      prismaUser.id,
      prismaUser.username,
      prismaUser.email,
      prismaUser.pixies,
      prismaUser.createdAt,
      prismaUser.updatedAt,
      prismaUser.password,
    );
  }
}
