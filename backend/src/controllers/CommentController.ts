import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { CommentModel, CreateCommentDTO } from '../models/Comment';
import { RecordModel } from '../models/Record';
import { NotificationService } from '../services/NotificationService';
import { RealTimeSyncService } from '../services/RealTimeSyncService';
import { ChangeEventModel, ChangeType, EntityType } from '../models/ChangeEvent';

export class CommentController extends BaseController {
  private notificationService: NotificationService;
  private realTimeSyncService: RealTimeSyncService;
  
  constructor() {
    super();
    this.notificationService = NotificationService.getInstance();
    this.realTimeSyncService = RealTimeSyncService.getInstance();
  }
  
  /**
   * Create a new comment
   */
  public createComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { record_id, content, parent_id } = req.body;
      const user_id = req.user!.id;
      
      // Validate record exists
      const record = await RecordModel.findById(record_id);
      if (!record) {
        return this.sendNotFoundResponse(res, 'Record not found');
      }
      
      // Validate parent comment if provided
      if (parent_id) {
        const parentComment = await CommentModel.findById(parent_id);
        if (!parentComment) {
          return this.sendNotFoundResponse(res, 'Parent comment not found');
        }
        
        // Ensure parent comment belongs to the same record
        if (parentComment.record_id !== record_id) {
          return this.sendBadRequestResponse(res, 'Parent comment does not belong to this record');
        }
      }
      
      // Create comment
      const commentData: CreateCommentDTO = {
        record_id,
        user_id,
        content,
        parent_id
      };
      
      const comment = await CommentModel.create(commentData);
      
      // Process notifications (mentions, etc.)
      await this.notificationService.processCommentNotifications(
        comment.id,
        record_id,
        user_id,
        content
      );
      
      // Create change event
      const changeEvent = await ChangeEventModel.create({
        type: ChangeType.CREATE,
        entityType: EntityType.RECORD,
        entityId: record_id,
        tableId: record.table_id,
        baseId: record.base_id,
        userId: user_id,
        metadata: {
          commentId: comment.id,
          action: 'comment_added'
        }
      });
      
      // Broadcast change
      await this.realTimeSyncService.broadcastChange(changeEvent);
      
      this.sendSuccessResponse(res, comment);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Get comments for a record
   */
  public getRecordComments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { record_id } = req.params;
      
      // Validate record exists
      const record = await RecordModel.findById(record_id);
      if (!record) {
        return this.sendNotFoundResponse(res, 'Record not found');
      }
      
      // Get threaded comments
      const comments = await CommentModel.getThreadedComments(record_id);
      
      this.sendSuccessResponse(res, comments);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Get a comment with its replies
   */
  public getCommentWithReplies = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const result = await CommentModel.getCommentWithReplies(id);
      
      this.sendSuccessResponse(res, result);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Update a comment
   */
  public updateComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const user_id = req.user!.id;
      
      // Validate comment exists
      const comment = await CommentModel.findById(id);
      if (!comment) {
        return this.sendNotFoundResponse(res, 'Comment not found');
      }
      
      // Verify ownership
      if (comment.user_id !== user_id) {
        return this.sendForbiddenResponse(res, 'You do not have permission to update this comment');
      }
      
      // Update comment
      const updatedComment = await CommentModel.update(id, { content });
      
      if (!updatedComment) {
        return this.sendNotFoundResponse(res, 'Comment not found');
      }
      
      // Get record for change event
      const record = await RecordModel.findById(comment.record_id);
      
      if (record) {
        // Create change event
        const changeEvent = await ChangeEventModel.create({
          type: ChangeType.UPDATE,
          entityType: EntityType.RECORD,
          entityId: comment.record_id,
          tableId: record.table_id,
          baseId: record.base_id,
          userId: user_id,
          metadata: {
            commentId: id,
            action: 'comment_updated'
          }
        });
        
        // Broadcast change
        await this.realTimeSyncService.broadcastChange(changeEvent);
      }
      
      this.sendSuccessResponse(res, updatedComment);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Delete a comment
   */
  public deleteComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user_id = req.user!.id;
      
      // Validate comment exists
      const comment = await CommentModel.findById(id);
      if (!comment) {
        return this.sendNotFoundResponse(res, 'Comment not found');
      }
      
      // Verify ownership
      if (comment.user_id !== user_id) {
        return this.sendForbiddenResponse(res, 'You do not have permission to delete this comment');
      }
      
      // Delete comment
      const deleted = await CommentModel.delete(id);
      
      if (!deleted) {
        return this.sendNotFoundResponse(res, 'Comment not found');
      }
      
      // Get record for change event
      const record = await RecordModel.findById(comment.record_id);
      
      if (record) {
        // Create change event
        const changeEvent = await ChangeEventModel.create({
          type: ChangeType.DELETE,
          entityType: EntityType.RECORD,
          entityId: comment.record_id,
          tableId: record.table_id,
          baseId: record.base_id,
          userId: user_id,
          metadata: {
            commentId: id,
            action: 'comment_deleted'
          }
        });
        
        // Broadcast change
        await this.realTimeSyncService.broadcastChange(changeEvent);
      }
      
      this.sendSuccessResponse(res, { success: true });
    } catch (error) {
      this.handleError(res, error);
    }
  };
}