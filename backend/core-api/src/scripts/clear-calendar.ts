import prisma from '../db';

async function main() {
  const deleted = await prisma.calendarEvent.deleteMany({ 
    where: { userId: 'b7a1e8c4-9c03-4931-8f52-219ae714affe' } 
  });
  console.log('Deleted stale calendar events:', deleted.count);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
