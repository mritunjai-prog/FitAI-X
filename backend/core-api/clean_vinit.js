const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning database...');
  
  // 1. Find the vinit user
  const vinit = await prisma.user.findFirst({
    where: { name: 'vinit' }
  });

  if (!vinit) {
    console.log('Vinit user not found!');
    return;
  }

  console.log(`Found vinit user with ID: ${vinit.id}`);

  // 2. Delete dependent records for all other users first because of NoAction constraints
  const otherUserIds = (await prisma.user.findMany({ where: { id: { not: vinit.id } } })).map(u => u.id);
  
  if (otherUserIds.length > 0) {
    await prisma.vitals.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.feedItem.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.workoutSession.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.workout.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.meal.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.calendarEvent.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.coachMessage.deleteMany({ where: { userId: { in: otherUserIds } } });
    
    // Now delete the users
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: otherUserIds } }
    });
    console.log(`Deleted ${deletedUsers.count} other users.`);
  } else {
    console.log('No other users to delete.');
  }

  // 3. Clear all data for vinit so they can test onboarding fresh
  await prisma.calendarEvent.deleteMany({ where: { userId: vinit.id } });
  await prisma.workout.deleteMany({ where: { userId: vinit.id } });
  await prisma.workoutSession.deleteMany({ where: { userId: vinit.id } });
  await prisma.meal.deleteMany({ where: { userId: vinit.id } });
  await prisma.coachMessage.deleteMany({ where: { userId: vinit.id } });
  await prisma.feedItem.deleteMany({ where: { userId: vinit.id } });
  
  console.log('Cleared all workouts, calendar events, and meals for vinit.');
  console.log('Database clean complete. Ready for testing.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
