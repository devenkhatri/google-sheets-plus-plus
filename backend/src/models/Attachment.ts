import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Attachment {
  id: string;
  record_id: string;
  field_id: string;
  filename: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  uploaded_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAttachmentDTO {
  record_id: string;
  field_id: string;
  filename: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  uploaded_by?: string;
}

export interface UpdateAttachmentDTO {
  filename?: string;
  thumbnail_url?: string;
}

export class AttachmentModel {
  private static readonly tableName = 'attachments';

  /**
   * Create a new attachment
   */
  static async create(attachmentData: CreateAttachmentDTO): Promise<Attachment> {
    const attachment: Partial<Attachment> = {
      ...attachmentData,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdAttachment] = await db(this.tableName).insert(attachment).returning('*');
    return createdAttachment;
  }

  /**
   * Find attachment by ID
   */
  static async findById(id: string): Promise<Attachment | null> {
    const attachment = await db(this.tableName).where({ id }).first();
    return attachment || null;
  }

  /**
   * Find attachments by record ID and field ID
   */
  static async findByRecordAndField(recordId: string, fieldId: string): Promise<Attachment[]> {
    const attachments = await db(this.tableName)
      .where({ record_id: recordId, field_id: fieldId })
      .orderBy('created_at', 'asc');
    
    return attachments;
  }

  /**
   * Find attachments by record ID
   */
  static async findByRecordId(recordId: string): Promise<Attachment[]> {
    const attachments = await db(this.tableName)
      .where({ record_id: recordId })
      .orderBy('created_at', 'asc');
    
    return attachments;
  }

  /**
   * Update attachment
   */
  static async update(id: string, attachmentData: UpdateAttachmentDTO): Promise<Attachment | null> {
    const updateData: Partial<Attachment> = {
      ...attachmentData,
      updated_at: new Date(),
    };
    
    const [updatedAttachment] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedAttachment || null;
  }

  /**
   * Delete attachment
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Delete attachments by record ID and field ID
   */
  static async deleteByRecordAndField(recordId: string, fieldId: string): Promise<number> {
    const deletedCount = await db(this.tableName)
      .where({ record_id: recordId, field_id: fieldId })
      .delete();
    
    return deletedCount;
  }

  /**
   * Bulk create attachments
   */
  static async bulkCreate(attachments: CreateAttachmentDTO[]): Promise<Attachment[]> {
    if (attachments.length === 0) {
      return [];
    }
    
    const attachmentsToInsert = attachments.map((attachment) => ({
      ...attachment,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }));
    
    const createdAttachments = await db(this.tableName)
      .insert(attachmentsToInsert)
      .returning('*');
    
    return createdAttachments;
  }
}