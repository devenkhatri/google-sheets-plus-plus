import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email').notNullable().unique();
    table.string('name').notNullable();
    table.string('password_hash').nullable();
    table.string('avatar_url').nullable();
    table.string('google_id').nullable().unique();
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('last_login').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('email');
    table.index('google_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}