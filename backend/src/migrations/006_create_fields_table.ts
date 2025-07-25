import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('fields', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('table_id').notNullable().references('id').inTable('tables').onDelete('CASCADE');
    table.string('name').notNullable();
    table.enum('type', [
      'text',
      'number',
      'singleSelect',
      'multiSelect',
      'date',
      'checkbox',
      'attachment',
      'formula',
      'lookup',
      'rollup',
      'link'
    ]).notNullable();
    table.jsonb('options').nullable();
    table.boolean('required').notNullable().defaultTo(false);
    table.integer('column_index').notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint for field name within a table
    table.unique(['table_id', 'name']);
    
    // Unique constraint for column index within a table
    table.unique(['table_id', 'column_index']);
    
    // Indexes
    table.index('table_id');
    table.index(['table_id', 'type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('fields');
}