const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('Cleaning up duplicate calendar events...');
  
  // Get all users
  const users = await p.user.findMany();
  
  for (const user of users) {
    // Delete all existing events for this user
    await p.calendarEvent.deleteMany({ where: { userId: user.id } });
    
    // Create exactly one set of 3 events
    const days = ['Legs & Core', 'Active Recovery', 'Upper Body'];
    for (let i = 0; i < 3; i++) {
      await p.calendarEvent.create({
        data: { userId: user.id, dayIndex: i + 1, title: days[i], type: 'workout' }
      });
    }
    console.log(`Cleaned and recreated calendar for user: ${user.email}`);
  }
}

main().catch(console.error).finally(() => p.$disconnect());
