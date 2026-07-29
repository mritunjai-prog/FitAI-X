import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // No seed data — database starts fresh.
  // Users are created via the registration flow only.
  console.log('✅ Database is clean. No demo data seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
