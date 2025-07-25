import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if audit_logs table already exists
  const auditLogsExists = await knex.schema.hasTable('audit_logs');
  
  if (!auditLogsExists) {
    await knex.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('action', 100).notNullable();
      table.string('entity_type', 100).notNullable();
      table.string('entity_id', 100).nullable();
      table.jsonb('before').nullable();
      table.jsonb('after').nullable();
      table.jsonb('metadata').nullable();
      table.string('ip_address', 45).nullable();
      table.string('user_agent', 500).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      
      // Add indexes
      table.index('user_id');
      table.index('action');
      table.index('entity_type');
      table.index('entity_id');
      table.index('created_at');
    });
    
    console.log('Created audit_logs table');
  }
  
  // Create security_blocks table for tracking blocked IPs
  const securityBlocksExists = await knex.schema.hasTable('security_blocks');
  
  if (!securityBlocksExists) {
    await knex.schema.createTable('security_blocks', (table) => {
      table.uuid('id').primary();
      table.string('ip_address', 45).notNullable();
      table.string('reason', 100).notNullable();
      table.integer('count').notNullable().defaultTo(1);
      table.timestamp('first_detected').notNullable().defaultTo(knex.fn.now());
      table.timestamp('last_detected').notNullable().defaultTo(knex.fn.now());
      table.boolean('is_blocked').notNullable().defaultTo(false);
      table.timestamp('block_expires').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      
      // Add indexes
      table.index('ip_address');
      table.index('is_blocked');
      table.index('block_expires');
    });
    
    console.log('Created security_blocks table');
  }
  
  // Create data_encryption_keys table for key rotation
  const dataEncryptionKeysExists = await knex.schema.hasTable('data_encryption_keys');
  
  if (!dataEncryptionKeysExists) {
    await knex.schema.createTable('data_encryption_keys', (table) => {
      table.uuid('id').primary();
      table.string('key_identifier', 100).notNullable().unique();
      table.text('encrypted_key').notNullable();
      table.boolean('is_active').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('activated_at').nullable();
      table.timestamp('retired_at').nullable();
      
      // Add indexes
      table.index('key_identifier');
      table.index('is_active');
    });
    
    console.log('Created data_encryption_keys table');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('data_encryption_keys');
  await knex.schema.dropTableIfExists('security_blocks');
  await knex.schema.dropTableIfExists('audit_logs');
}