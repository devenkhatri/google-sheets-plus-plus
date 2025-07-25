import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('links', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('source_field_id').notNullable().references('id').inTable('fields').onDelete('CASCADE');
    table.uuid('target_field_id').notNullable().references('id').inTable('fields').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint to prevent duplicate links
    table.unique(['source_field_id', 'target_field_id']);
    
    // Indexes
    table.index('source_field_id');
    table.index('target_field_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('links');
}