// electron/models/UserModel.ts
import { getDatabase } from "../database/database";

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  full_name: string;
  is_active: number;
  created_at?: string;
}

export interface CreateUserData {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: string;
}

export const findUserByUsername = async (
  username: string
): Promise<User | null> => {
  const db = getDatabase();
  const sql = `
    SELECT id, username, password_hash, role, full_name, is_active, created_at
    FROM users 
    WHERE username = ?
  `;

  const result = db.prepare(sql).get(username) as User | undefined;
  return result || null;
};

export const createUser = async (userData: CreateUserData): Promise<void> => {
  const db = getDatabase();
  const sql = `
    INSERT INTO users (id, username, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.prepare(sql).run(
    userData.id,
    userData.username,
    userData.password_hash,
    userData.full_name,
    userData.role
  );
};

export const findUserById = async (id: string): Promise<User | null> => {
  const db = getDatabase();
  const sql = `
    SELECT id, username, password_hash, role, full_name, is_active, created_at
    FROM users 
    WHERE id = ?
  `;

  const result = db.prepare(sql).get(id) as User | undefined;
  return result || null;
};

export const updateUser = async (
  id: string,
  userData: Partial<CreateUserData>
): Promise<void> => {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | undefined)[] = [];

  if (userData.username) {
    fields.push("username = ?");
    values.push(userData.username);
  }
  if (userData.password_hash) {
    fields.push("password_hash = ?");
    values.push(userData.password_hash);
  }
  if (userData.full_name) {
    fields.push("full_name = ?");
    values.push(userData.full_name);
  }
  if (userData.role) {
    fields.push("role = ?");
    values.push(userData.role);
  }

  if (fields.length === 0) return;

  values.push(id);
  const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;

  db.prepare(sql).run(...values);
};

export const toggleUserStatus = async (
  id: string,
  isActive: boolean
): Promise<void> => {
  const db = getDatabase();
  const sql = `UPDATE users SET is_active = ? WHERE id = ?`;
  db.prepare(sql).run(isActive ? 1 : 0, id);
};

export const getAllUsers = async (): Promise<User[]> => {
  const db = getDatabase();
  const sql = `
    SELECT id, username, password_hash, role, full_name, is_active, created_at
    FROM users
    ORDER BY full_name
  `;

  return db.prepare(sql).all() as User[];
};
