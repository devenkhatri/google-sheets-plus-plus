import { BaseCommand, CommandContext } from './types';
import { 
  createTable, 
  updateTable, 
  deleteTable 
} from '../slices/tableSlice';

// Create Table Command
export class CreateTableCommand extends BaseCommand {
  private baseId: string;
  private tableData: any;
  private createdTableId?: string;

  constructor(
    baseId: string,
    tableData: any,
    context: CommandContext,
    description?: string
  ) {
    super(
      'CREATE_TABLE',
      description || `Create table "${tableData.name}" in base ${baseId}`,
      context
    );
    this.baseId = baseId;
    this.tableData = tableData;
  }

  async execute(): Promise<void> {
    try {
      const result = await this.context.dispatch(
        createTable({
          baseId: this.baseId,
          data: this.tableData,
        })
      ).unwrap();
      
      this.createdTableId = result.data.table.id;
    } catch (error) {
      throw new Error(`Failed to create table: ${error}`);
    }
  }

  async undo(): Promise<void> {
    if (!this.createdTableId) {
      throw new Error('Cannot undo: No table ID available');
    }

    try {
      await this.context.dispatch(
        deleteTable(this.createdTableId)
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to undo table creation: ${error}`);
    }
  }

  canUndo(): boolean {
    return !!this.createdTableId;
  }
}

// Update Table Command
export class UpdateTableCommand extends BaseCommand {
  private tableId: string;
  private newData: any;
  private previousData: any;

  constructor(
    tableId: string,
    newData: any,
    previousData: any,
    context: CommandContext,
    description?: string
  ) {
    super(
      'UPDATE_TABLE',
      description || `Update table ${tableId}`,
      context
    );
    this.tableId = tableId;
    this.newData = newData;
    this.previousData = previousData;
  }

  async execute(): Promise<void> {
    try {
      await this.context.dispatch(
        updateTable({
          tableId: this.tableId,
          data: this.newData,
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to update table: ${error}`);
    }
  }

  async undo(): Promise<void> {
    try {
      await this.context.dispatch(
        updateTable({
          tableId: this.tableId,
          data: this.previousData,
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to undo table update: ${error}`);
    }
  }
}

// Delete Table Command
export class DeleteTableCommand extends BaseCommand {
  private tableId: string;
  private deletedTable?: any;

  constructor(
    tableId: string,
    context: CommandContext,
    description?: string
  ) {
    super(
      'DELETE_TABLE',
      description || `Delete table ${tableId}`,
      context
    );
    this.tableId = tableId;
  }

  async execute(): Promise<void> {
    // Store the table data before deletion for undo
    const state = this.context.getState();
    this.deletedTable = state.tables.tables.find((t: any) => t.id === this.tableId);

    if (!this.deletedTable) {
      throw new Error('Table not found in state');
    }

    try {
      await this.context.dispatch(
        deleteTable(this.tableId)
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to delete table: ${error}`);
    }
  }

  async undo(): Promise<void> {
    if (!this.deletedTable) {
      throw new Error('Cannot undo: No table data available');
    }

    try {
      // Recreate the table with the same data
      await this.context.dispatch(
        createTable({
          baseId: this.deletedTable.base_id,
          data: {
            name: this.deletedTable.name,
            description: this.deletedTable.description,
            fields: this.deletedTable.fields,
          },
        })
      ).unwrap();
    } catch (error) {
      throw new Error(`Failed to undo table deletion: ${error}`);
    }
  }

  canUndo(): boolean {
    return !!this.deletedTable;
  }
}