import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create templates table
  await knex.schema.createTable('templates', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.string('category').notNullable();
    table.json('tags').defaultTo('[]');
    table.json('structure').notNullable();
    table.string('preview_image');
    table.boolean('is_public').defaultTo(false);
    table.string('created_by').notNullable();
    table.integer('usage_count').defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('category');
    table.index('created_by');
    table.index('is_public');
    table.index(['category', 'is_public']);
  });

  // Create template categories table
  await knex.schema.createTable('template_categories', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.string('icon');
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('is_active');
    table.index('sort_order');
  });

  // Insert default categories
  await knex('template_categories').insert([
    {
      id: 'project-management',
      name: 'Project Management',
      description: 'Templates for managing projects and tasks',
      icon: 'project',
      sort_order: 1,
      is_active: true
    },
    {
      id: 'crm',
      name: 'Customer Relationship Management',
      description: 'Templates for managing customers and sales',
      icon: 'users',
      sort_order: 2,
      is_active: true
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      description: 'Templates for tracking inventory and assets',
      icon: 'package',
      sort_order: 3,
      is_active: true
    },
    {
      id: 'content',
      name: 'Content Planning',
      description: 'Templates for content creation and marketing',
      icon: 'edit',
      sort_order: 4,
      is_active: true
    },
    {
      id: 'hr',
      name: 'Human Resources',
      description: 'Templates for HR processes and employee management',
      icon: 'team',
      sort_order: 5,
      is_active: true
    },
    {
      id: 'custom',
      name: 'Custom Templates',
      description: 'User-created custom templates',
      icon: 'custom',
      sort_order: 6,
      is_active: true
    }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('templates');
  await knex.schema.dropTableIfExists('template_categories');
}