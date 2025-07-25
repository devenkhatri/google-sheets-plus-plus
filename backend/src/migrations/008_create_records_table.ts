import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('table_id').notNullable().references('id').inTable('tables').onDelete('CASCADE');
    table.integer('row_index').notNullable();
    table.jsonb('fields').notNullable();
    table.boolean('deleted').notNullable().defaultTo(false);
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint for row index within a table
    table.unique(['table_id', 'row_index']);
    
    // Indexes
    table.index('table_id');
    table.index(['table_id', 'deleted']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('records');
}