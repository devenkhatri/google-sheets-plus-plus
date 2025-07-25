import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('tables', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('base_id').notNullable().references('id').inTable('bases').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').nullable();
    table.integer('google_sheet_id').notNullable();
    table.string('google_sheet_name').notNullable();
    table.integer('record_count').notNullable().defaultTo(0);
    table.jsonb('settings').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint for table name within a base
    table.unique(['base_id', 'name']);
    
    // Unique constraint for Google Sheet ID within a base
    table.unique(['base_id', 'google_sheet_id']);
    
    // Indexes
    table.index('base_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('tables');
}