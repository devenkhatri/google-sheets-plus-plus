import { db } from '../config/database';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  avatar_url?: string;
  google_id?: string;
  email_verified: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  email: string;
  name: string;
  password?: string;
  avatar_url?: string;
  google_id?: string;
  email_verified?: boolean;
}

export interface UpdateUserDTO {
  name?: string;
  password?: string;
  avatar_url?: string;
  email_verified?: boolean;
}

export class UserModel {
  private static readonly tableName = 'users';

  /**
   * Create a new user
   */
  static async create(userData: CreateUserDTO): Promise<User> {
    const { password, ...userDataWithoutPassword } = userData;
    
    const user: Partial<User> = {
      ...userDataWithoutPassword,
      id: uuidv4(),
      email_verified: userData.email_verified || false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // Hash password if provided
    if (password) {
      user.password_hash = await bcrypt.hash(password, 10);
    }
    
    const [createdUser] = await db(this.tableName).insert(user).returning('*');
    return createdUser;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const user = await db(this.tableName).where({ id }).first();
    return user || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const user = await db(this.tableName).where({ email }).first();
    return user || null;
  }

  /**
   * Find user by Google ID
   */
  static async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await db(this.tableName).where({ google_id: googleId }).first();
    return user || null;
  }

  /**
   * Update user
   */
  static async update(id: string, userData: UpdateUserDTO): Promise<User | null> {
    const updateData: Partial<User> = {
      ...userData,
      updated_at: new Date(),
    };
    
    // Hash password if provided
    if (userData.password) {
      updateData.password_hash = await bcrypt.hash(userData.password, 10);
      delete updateData.password;
    }
    
    const [updatedUser] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedUser || null;
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .update({
        last_login: new Date(),
        updated_at: new Date(),
      });
  }

  /**
   * Verify password
   */
  static async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.password_hash) {
      return false;
    }
    
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }
}