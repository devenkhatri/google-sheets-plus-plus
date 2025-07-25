import { useCallback } from 'react';
import { commandService } from '../services/commandService';
import {
  CreateRecordCommand,
  UpdateRecordCommand,
  DeleteRecordCommand,
  BulkUpdateCommand,
  BulkCreateCommand,
} from '../store/commands/recordCommands';
import {
  CreateTableCommand,
  UpdateTableCommand,
  DeleteTableCommand,
} from '../store/commands/tableCommands';
import {
  CreateFieldCommand,
  UpdateFieldCommand,
  DeleteFieldCommand,
  ReorderFieldsCommand,
} from '../store/commands/fieldCommands';

export const useCommands = () => {
  const context = commandService.getContext();

  const createRecord = useCallback(
    async (tableId: string, fields: any, description?: string) => {
      const command = new CreateRecordCommand(tableId, fields, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  const updateRecord = useCallback(
    async (
      recordId: string,
      newFields: any,
      previousFields: any,
      description?: string
    ) => {
      const command = new UpdateRecordCommand(
        recordId,
        newFields,
        previousFields,
        context,
        description
      );
      await commandService.executeCommand(command);
    },
    [context]
  );

  const deleteRecord = useCallback(
    async (recordId: string, description?: string) => {
      const command = new DeleteRecordCommand(recordId, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  const bulkUpdateRecords = useCallback(
    async (
      updates: Array<{ id: string; newFields: any; previousFields: any }>,
      description?: string
    ) => {
      const command = new BulkUpdateCommand(updates, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  const bulkCreateRecords = useCallback(
    async (
      tableId: string,
      recordsData: any[],
      description?: string
    ) => {
      const command = new BulkCreateCommand(tableId, recordsData, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  // Table commands
  const createTable = useCallback(
    async (baseId: string, tableData: any, description?: string) => {
      const command = new CreateTableCommand(baseId, tableData, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  const updateTable = useCallback(
    async (
      tableId: string,
      newData: any,
      previousData: any,
      description?: string
    ) => {
      const command = new UpdateTableCommand(tableId, newData, previousData, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  const deleteTable = useCallback(
    async (tableId: string, description?: string) => {
      const command = new DeleteTableCommand(tableId, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  // Field commands
  const createField = useCallback(
    async (tableId: string, fieldData: any, description?: string) => {
      const command = new CreateFieldCommand(tableId, fieldData, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  const updateField = useCallback(
    async (
      fieldId: string,
      newData: any,
      previousData: any,
      description?: string
    ) => {
      const command = new UpdateFieldCommand(fieldId, newData, previousData, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  const deleteField = useCallback(
    async (fieldId: string, description?: string) => {
      const command = new DeleteFieldCommand(fieldId, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  const reorderFields = useCallback(
    async (
      tableId: string,
      newOrder: string[],
      previousOrder: string[],
      description?: string
    ) => {
      const command = new ReorderFieldsCommand(tableId, newOrder, previousOrder, context, description);
      await commandService.executeCommand(command);
    },
    [context]
  );

  return {
    // Record commands
    createRecord,
    updateRecord,
    deleteRecord,
    bulkUpdateRecords,
    bulkCreateRecords,
    
    // Table commands
    createTable,
    updateTable,
    deleteTable,
    
    // Field commands
    createField,
    updateField,
    deleteField,
    reorderFields,
  };
};