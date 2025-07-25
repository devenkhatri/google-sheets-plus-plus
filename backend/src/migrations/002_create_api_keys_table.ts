import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('key').notNullable().unique();
    table.string('name').notNullable();
    table.text('description').nullable();
    table.boolean('active').defaultTo(true);
    table.timestamp('last_used').nullable();
    table.timestamp('expires_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('user_id');
    table.index('key');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('api_keys');
}