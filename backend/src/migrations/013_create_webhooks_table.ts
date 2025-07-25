import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('webhooks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('base_id').notNullable().references('id').inTable('bases').onDelete('CASCADE');
    table.uuid('table_id').nullable().references('id').inTable('tables').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('url').notNullable();
    table.jsonb('events').notNullable();
    table.string('secret').nullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('base_id');
    table.index('table_id');
    table.index('active');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('webhooks');
}