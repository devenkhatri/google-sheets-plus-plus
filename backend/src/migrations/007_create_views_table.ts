import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('views', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('table_id').notNullable().references('id').inTable('tables').onDelete('CASCADE');
    table.string('name').notNullable();
    table.enum('type', ['grid', 'kanban', 'calendar', 'gallery']).notNullable().defaultTo('grid');
    table.jsonb('configuration').nullable();
    table.jsonb('filters').nullable();
    table.jsonb('sorts').nullable();
    table.jsonb('field_visibility').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint for view name within a table
    table.unique(['table_id', 'name']);
    
    // Indexes
    table.index('table_id');
    table.index(['table_id', 'type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('views');
}