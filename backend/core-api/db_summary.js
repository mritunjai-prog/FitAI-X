const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const messages = await prisma.coachMessage.count();
  const workouts = await prisma.workout.count();
  const meals = await prisma.meal.count();
  const events = await prisma.calendarEvent.count();
  
  console.log('=== Database Summary ===');
  console.log('Users: ' + users);
  console.log('Coach Messages: ' + messages);
  console.log('Workouts: ' + workouts);
  console.log('Meals Logged: ' + meals);
  console.log('Calendar Events: ' + events);
  console.log('========================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
