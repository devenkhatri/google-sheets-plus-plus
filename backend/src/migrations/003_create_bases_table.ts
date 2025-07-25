import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable uuid-ossp extension if not already enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  
  return knex.schema.createTable('bases', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table.text('description').nullable();
    table.string('google_sheets_id').notNullable().unique();
    table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('settings').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('owner_id');
    table.index('google_sheets_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('bases');
}