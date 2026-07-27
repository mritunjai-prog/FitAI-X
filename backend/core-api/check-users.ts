import prisma from './src/db';

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, age: true, weight: true, height: true, goal: true }
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

checkUsers().catch(console.error);
