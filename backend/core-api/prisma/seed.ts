import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // No default users seeded. Users should be created via the registration flow.

  console.log('Seed completed successfully. No fake users or feed data included.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
