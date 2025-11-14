/**
 * Database Seed Script
 * Creates initial admin user and sample data for testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('password123', 10);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
    },
  });

  console.log(`Admin user created: ${admin.email}`);

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Miami Businesses',
      description: 'Local businesses in Miami, Florida',
      status: 'active',
      createdByAdminId: admin.id,
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'San Francisco Businesses',
      description: 'Local businesses in San Francisco, California',
      status: 'active',
      createdByAdminId: admin.id,
    },
  });

  console.log(`Projects created: ${project1.name}, ${project2.name}`);

  // Note: Sample businesses require real Google Place IDs
  // Add sample businesses manually through the admin interface

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
