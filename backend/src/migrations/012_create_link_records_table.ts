import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('link_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('link_id').notNullable().references('id').inTable('links').onDelete('CASCADE');
    table.uuid('source_record_id').notNullable().references('id').inTable('records').onDelete('CASCADE');
    table.uuid('target_record_id').notNullable().references('id').inTable('records').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Unique constraint to prevent duplicate links between records
    table.unique(['link_id', 'source_record_id', 'target_record_id']);
    
    // Indexes
    table.index('link_id');
    table.index('source_record_id');
    table.index('target_record_id');
    table.index(['source_record_id', 'target_record_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('link_records');
}