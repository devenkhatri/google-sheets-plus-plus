import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('saved_searches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('query').notNullable();
    table.uuid('baseId').references('id').inTable('bases').onDelete('CASCADE');
    table.uuid('tableId').references('id').inTable('tables').onDelete('CASCADE');
    table.specificType('fieldIds', 'uuid[]');
    table.boolean('notificationsEnabled').defaultTo(false);
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index('userId');
    table.index('baseId');
    table.index('tableId');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('saved_searches');
}