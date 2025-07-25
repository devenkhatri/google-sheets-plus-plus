import { BaseCommand, CommandContext } from './types';
import { 
  createRecord, 
  updateRecord, 
  deleteRecord, 
  restoreRecord,
  bulkCreateRecords,
  bulkUpdateRecords
} from '../slices/recordSlice';

// Create Record Command
export class CreateRecordCommand extends BaseCommand {
  private tableId: string;
  private fields: any;
  private createdRecordId?: string;

  constructor(
    tableId: string,
    fields: any,
    context: CommandContext,
    description?: string
  ) {
    super(
      'CREATE_RECORD',
      description || `Create record in table ${tableId}`,
      context
    );
    this.tableId = tableId;
    this.fields = fields;
  }

  async execute(): Promise<void> {
    try {
      const result = await this.context.dispatch(
        createRecord({
          tableId: this.tableId,
          fields: this.fields,
          syncToSheets: true,
        })
      ).unwrap();
      
      this.createdRecordId = result.data.record.id;
    } catch (error) {
      throw new Error(`Failed to create record: ${error}`);
    }
  }

  async undo(): Promise<void> {
    if (!this.createdRecordId) {
      throw new Error('Cannot undo: No record ID available');
    }

    try {
      await this.context.dispatch(
        deleteRecord({
          id: this.createdRecordId,
          syncToSheets: true,
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to undo record creation: ${error}`);
    }
  }

  canUndo(): boolean {
    return !!this.createdRecordId;
  }
}

// Update Record Command
export class UpdateRecordCommand extends BaseCommand {
  private recordId: string;
  private newFields: any;
  private previousFields: any;

  constructor(
    recordId: string,
    newFields: any,
    previousFields: any,
    context: CommandContext,
    description?: string
  ) {
    super(
      'UPDATE_RECORD',
      description || `Update record ${recordId}`,
      context
    );
    this.recordId = recordId;
    this.newFields = newFields;
    this.previousFields = previousFields;
  }

  async execute(): Promise<void> {
    try {
      await this.context.dispatch(
        updateRecord({
          id: this.recordId,
          updates: { fields: this.newFields },
          syncToSheets: true,
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to update record: ${error}`);
    }
  }

  async undo(): Promise<void> {
    try {
      await this.context.dispatch(
        updateRecord({
          id: this.recordId,
          updates: { fields: this.previousFields },
          syncToSheets: true,
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to undo record update: ${error}`);
    }
  }
}

// Delete Record Command
export class DeleteRecordCommand extends BaseCommand {
  private recordId: string;
  private deletedRecord?: any;

  constructor(
    recordId: string,
    context: CommandContext,
    description?: string
  ) {
    super(
      'DELETE_RECORD',
      description || `Delete record ${recordId}`,
      context
    );
    this.recordId = recordId;
  }

  async execute(): Promise<void> {
    // Store the record data before deletion for undo
    const state = this.context.getState();
    this.deletedRecord = state.records.records.find((r: any) => r.id === this.recordId);

    if (!this.deletedRecord) {
      throw new Error('Record not found in state');
    }

    try {
      await this.context.dispatch(
        deleteRecord({
          id: this.recordId,
          syncToSheets: true,
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to delete record: ${error}`);
    }
  }

  async undo(): Promise<void> {
    if (!this.deletedRecord) {
      throw new Error('Cannot undo: No record data available');
    }

    try {
      await this.context.dispatch(
        restoreRecord({
          id: this.recordId,
          syncToSheets: true,
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to undo record deletion: ${error}`);
    }
  }

  canUndo(): boolean {
    return !!this.deletedRecord;
  }
}

// Bulk Update Command
export class BulkUpdateCommand extends BaseCommand {
  private updates: Array<{ id: string; newFields: any; previousFields: any }>;

  constructor(
    updates: Array<{ id: string; newFields: any; previousFields: any }>,
    context: CommandContext,
    description?: string
  ) {
    super(
      'BULK_UPDATE',
      description || `Bulk update ${updates.length} records`,
      context
    );
    this.updates = updates;
  }

  async execute(): Promise<void> {
    try {
      const updatePayload = this.updates.map(update => ({
        id: update.id,
        fields: update.newFields,
      }));

      await this.context.dispatch(
        bulkUpdateRecords({
          updates: updatePayload,
          syncToSheets: true,
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to bulk update records: ${error}`);
    }
  }

  async undo(): Promise<void> {
    try {
      // Undo in reverse order
      for (let i = this.updates.length - 1; i >= 0; i--) {
        const update = this.updates[i];
        await this.context.dispatch(
          updateRecord({
            id: update.id,
            updates: { fields: update.previousFields },
            syncToSheets: true,
          })
        ).unwrap();
      }
    } catch (error) {
      throw new Error(`Failed to undo bulk update: ${error}`);
    }
  }
}

// Bulk Create Command
export class BulkCreateCommand extends BaseCommand {
  private tableId: string;
  private recordsData: any[];
  private createdRecordIds: string[] = [];

  constructor(
    tableId: string,
    recordsData: any[],
    context: CommandContext,
    description?: string
  ) {
    super(
      'BULK_CREATE',
      description || `Create ${recordsData.length} records in table ${tableId}`,
      context
    );
    this.tableId = tableId;
    this.recordsData = recordsData;
  }

  async execute(): Promise<void> {
    try {
      const result = await this.context.dispatch(
        bulkCreateRecords({
          tableId: this.tableId,
          records: this.recordsData,
          syncToSheets: true,
        })
      ).unwrap();
      
      this.createdRecordIds = result.data.records.map((r: any) => r.id);
    } catch (error) {
      throw new Error(`Failed to bulk create records: ${error}`);
    }
  }

  async undo(): Promise<void> {
    if (this.createdRecordIds.length === 0) {
      throw new Error('Cannot undo: No record IDs available');
    }

    try {
      // Delete all created records in reverse order
      for (let i = this.createdRecordIds.length - 1; i >= 0; i--) {
        await this.context.dispatch(
          deleteRecord({
            id: this.createdRecordIds[i],
            syncToSheets: true,
          })
        ).unwrap();
      }
    } catch (error) {
      throw new Error(`Failed to undo bulk record creation: ${error}`);
    }
  }

  canUndo(): boolean {
    return this.createdRecordIds.length > 0;
  }
}