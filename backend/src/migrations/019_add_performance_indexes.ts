import { Knex } from 'knex';

/**
 * Migration to add performance indexes to improve query performance
 */
export async function up(knex: Knex): Promise<void> {
  // Add indexes to records table
  await knex.schema.table('records', (table) => {
    // Index for querying records by table_id (most common query)
    table.index('table_id', 'idx_records_table_id');
    
    // Composite index for table_id and deleted for filtered queries
    table.index(['table_id', 'deleted'], 'idx_records_table_deleted');
    
    // Index for row_index to optimize sorting and Google Sheets sync
    table.index('row_index', 'idx_records_row_index');
    
    // Index for created_at and updated_at for sorting and filtering
    table.index('created_at', 'idx_records_created_at');
    table.index('updated_at', 'idx_records_updated_at');
    
    // Index for created_by and last_modified_by for user activity queries
    table.index('created_by', 'idx_records_created_by');
    table.index('last_modified_by', 'idx_records_last_modified_by');
  });
  
  // Add indexes to fields table
  await knex.schema.table('fields', (table) => {
    // Index for querying fields by table_id
    table.index('table_id', 'idx_fields_table_id');
    
    // Index for field type to optimize queries for specific field types
    table.index('type', 'idx_fields_type');
    
    // Index for column_index to optimize sorting
    table.index('column_index', 'idx_fields_column_index');
  });
  
  // Add indexes to tables table
  await knex.schema.table('tables', (table) => {
    // Index for querying tables by base_id
    table.index('base_id', 'idx_tables_base_id');
    
    // Index for google_sheet_id to optimize Google Sheets sync
    table.index('google_sheet_id', 'idx_tables_google_sheet_id');
  });
  
  // Add indexes to views table
  await knex.schema.table('views', (table) => {
    // Index for querying views by table_id
    table.index('table_id', 'idx_views_table_id');
    
    // Index for view type to optimize queries for specific view types
    table.index('type', 'idx_views_type');
  });
  
  // Add indexes to links table
  await knex.schema.table('links', (table) => {
    // Indexes for source and target fields
    table.index('source_field_id', 'idx_links_source_field_id');
    table.index('target_field_id', 'idx_links_target_field_id');
  });
  
  // Add indexes to link_records table
  await knex.schema.table('link_records', (table) => {
    // Index for link_id to optimize queries
    table.index('link_id', 'idx_link_records_link_id');
    
    // Composite indexes for source and target records
    table.index(['link_id', 'source_record_id'], 'idx_link_records_link_source');
    table.index(['link_id', 'target_record_id'], 'idx_link_records_link_target');
  });
  
  // Add indexes to comments table
  await knex.schema.table('comments', (table) => {
    // Index for record_id to optimize queries
    table.index('record_id', 'idx_comments_record_id');
    
    // Index for user_id to optimize user activity queries
    table.index('user_id', 'idx_comments_user_id');
    
    // Index for created_at for sorting
    table.index('created_at', 'idx_comments_created_at');
  });
  
  // Add indexes to webhooks table
  await knex.schema.table('webhooks', (table) => {
    // Index for table_id to optimize queries
    table.index('table_id', 'idx_webhooks_table_id');
  });
  
  // Add indexes to audit_logs table
  await knex.schema.table('audit_logs', (table) => {
    // Index for entity_id to optimize queries
    table.index('entity_id', 'idx_audit_logs_entity_id');
    
    // Index for entity_type to optimize queries
    table.index('entity_type', 'idx_audit_logs_entity_type');
    
    // Index for user_id to optimize user activity queries
    table.index('user_id', 'idx_audit_logs_user_id');
    
    // Index for created_at for sorting and filtering
    table.index('created_at', 'idx_audit_logs_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove indexes from records table
  await knex.schema.table('records', (table) => {
    table.dropIndex('', 'idx_records_table_id');
    table.dropIndex('', 'idx_records_table_deleted');
    table.dropIndex('', 'idx_records_row_index');
    table.dropIndex('', 'idx_records_created_at');
    table.dropIndex('', 'idx_records_updated_at');
    table.dropIndex('', 'idx_records_created_by');
    table.dropIndex('', 'idx_records_last_modified_by');
  });
  
  // Remove indexes from fields table
  await knex.schema.table('fields', (table) => {
    table.dropIndex('', 'idx_fields_table_id');
    table.dropIndex('', 'idx_fields_type');
    table.dropIndex('', 'idx_fields_column_index');
  });
  
  // Remove indexes from tables table
  await knex.schema.table('tables', (table) => {
    table.dropIndex('', 'idx_tables_base_id');
    table.dropIndex('', 'idx_tables_google_sheet_id');
  });
  
  // Remove indexes from views table
  await knex.schema.table('views', (table) => {
    table.dropIndex('', 'idx_views_table_id');
    table.dropIndex('', 'idx_views_type');
  });
  
  // Remove indexes from links table
  await knex.schema.table('links', (table) => {
    table.dropIndex('', 'idx_links_source_field_id');
    table.dropIndex('', 'idx_links_target_field_id');
  });
  
  // Remove indexes from link_records table
  await knex.schema.table('link_records', (table) => {
    table.dropIndex('', 'idx_link_records_link_id');
    table.dropIndex('', 'idx_link_records_link_source');
    table.dropIndex('', 'idx_link_records_link_target');
  });
  
  // Remove indexes from comments table
  await knex.schema.table('comments', (table) => {
    table.dropIndex('', 'idx_comments_record_id');
    table.dropIndex('', 'idx_comments_user_id');
    table.dropIndex('', 'idx_comments_created_at');
  });
  
  // Remove indexes from webhooks table
  await knex.schema.table('webhooks', (table) => {
    table.dropIndex('', 'idx_webhooks_table_id');
  });
  
  // Remove indexes from audit_logs table
  await knex.schema.table('audit_logs', (table) => {
    table.dropIndex('', 'idx_audit_logs_entity_id');
    table.dropIndex('', 'idx_audit_logs_entity_type');
    table.dropIndex('', 'idx_audit_logs_user_id');
    table.dropIndex('', 'idx_audit_logs_created_at');
  });
}