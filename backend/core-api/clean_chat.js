const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('Clearing chat history to fix context poisoning...');
  await p.coachMessage.deleteMany();
  console.log('Chat history cleared!');
}

main().catch(console.error).finally(() => p.$disconnect());
