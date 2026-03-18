import { AuthService } from "../services/index.js";
import type { UserModel } from "../models/index.js";

export async function registerUser(
  username: string,
  email: string,
  password: string,
): Promise<{ user: UserModel; token: string }> {
  return AuthService.register(username, email, password);
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: UserModel; token: string }> {
  return AuthService.login(email, password);
}

export async function getUserProfile(userId: string): Promise<UserModel> {
  return AuthService.getProfile(userId);
}
