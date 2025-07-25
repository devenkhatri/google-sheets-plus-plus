import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Comment {
  id: string;
  record_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCommentDTO {
  record_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
}

export interface UpdateCommentDTO {
  content: string;
}

export class CommentModel {
  private static readonly tableName = 'comments';

  /**
   * Create a new comment
   */
  static async create(commentData: CreateCommentDTO): Promise<Comment> {
    const comment: Partial<Comment> = {
      ...commentData,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdComment] = await db(this.tableName).insert(comment).returning('*');
    return createdComment;
  }

  /**
   * Find comment by ID
   */
  static async findById(id: string): Promise<Comment | null> {
    const comment = await db(this.tableName).where({ id }).first();
    return comment || null;
  }

  /**
   * Find comments by record ID
   */
  static async findByRecordId(recordId: string): Promise<Comment[]> {
    const comments = await db(this.tableName)
      .select('comments.*', 'users.name as user_name', 'users.avatar_url as user_avatar')
      .join('users', 'comments.user_id', 'users.id')
      .where({ record_id: recordId })
      .orderBy('created_at', 'asc');
    
    return comments;
  }

  /**
   * Find comments by user ID
   */
  static async findByUserId(userId: string, limit: number = 50): Promise<Comment[]> {
    const comments = await db(this.tableName)
      .select('comments.*', 'records.table_id')
      .join('records', 'comments.record_id', 'records.id')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    return comments;
  }

  /**
   * Update comment
   */
  static async update(id: string, commentData: UpdateCommentDTO): Promise<Comment | null> {
    const updateData: Partial<Comment> = {
      ...commentData,
      updated_at: new Date(),
    };
    
    const [updatedComment] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedComment || null;
  }

  /**
   * Delete comment
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Get comment thread
   */
  static async getThread(parentId: string): Promise<Comment[]> {
    const comments = await db(this.tableName)
      .select('comments.*', 'users.name as user_name', 'users.avatar_url as user_avatar')
      .join('users', 'comments.user_id', 'users.id')
      .where({ parent_id: parentId })
      .orderBy('created_at', 'asc');
    
    return comments;
  }
  
  /**
   * Get comment with its thread
   */
  static async getCommentWithReplies(commentId: string): Promise<{ comment: Comment; replies: Comment[] }> {
    // Get the main comment
    const comment = await this.findById(commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    // Get replies if this is a parent comment (no parent_id)
    let replies: Comment[] = [];
    if (!comment.parent_id) {
      replies = await this.getThread(commentId);
    }
    
    return { comment, replies };
  }
  
  /**
   * Get all comments for a record with threaded structure
   */
  static async getThreadedComments(recordId: string): Promise<{ comment: Comment; replies: Comment[] }[]> {
    // Get all parent comments (no parent_id)
    const parentComments = await db(this.tableName)
      .select('comments.*', 'users.name as user_name', 'users.avatar_url as user_avatar')
      .join('users', 'comments.user_id', 'users.id')
      .where({ record_id: recordId, parent_id: null })
      .orderBy('created_at', 'desc');
    
    // Get replies for each parent comment
    const threaded = [];
    
    for (const comment of parentComments) {
      const replies = await this.getThread(comment.id);
      threaded.push({ comment, replies });
    }
    
    return threaded;
  }

  /**
   * Count comments by record ID
   */
  static async countByRecordId(recordId: string): Promise<number> {
    const result = await db(this.tableName)
      .where({ record_id: recordId })
      .count('id as count')
      .first();
    
    return parseInt(result?.count.toString() || '0', 10);
  }
}