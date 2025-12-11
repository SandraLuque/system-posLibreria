// electron/services/AuthService.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByUsername } from "../models/UserModel";

interface UserPayload {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface LoginResponse {
  user: UserPayload;
  token: string;
}

export class AuthService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-secret-key";
  }

  async loginUser(username: string, password: string): Promise<LoginResponse> {
    const user = await findUserByUsername(username);

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    if (!user.is_active || user.is_active === 0) {
      throw new Error("Usuario inactivo");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new Error("Contraseña incorrecta");
    }

    const payload: UserPayload = {
      id: user.id,
      name: user.full_name,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: "1h" });

    return { user: payload, token };
  }

  verifyToken(token: string): UserPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as UserPayload;
    } catch {
      throw new Error("Token inválido o expirado");
    }
  }
}

export const authService = new AuthService();
