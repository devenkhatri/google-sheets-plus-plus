import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('record_id').notNullable().references('id').inTable('records').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.uuid('parent_id').nullable().references('id').inTable('comments').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('record_id');
    table.index('user_id');
    table.index('parent_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('comments');
}