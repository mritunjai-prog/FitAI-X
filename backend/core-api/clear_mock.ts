import prisma from './src/db';

async function clearData() {
  await prisma.calendarEvent.deleteMany({});
  await prisma.meal.deleteMany({});
  console.log('Cleared mock calendar events and meals.');
}

clearData();
