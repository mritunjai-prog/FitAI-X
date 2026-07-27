const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();
const disconnect = '$disconnect';
p.user.findMany({
  select: {
    id: true, name: true, email: true, gender: true, experience: true,
    goal: true, equipment: true, diet: true, age: true, weight: true, height: true
  }
}).then(u => {
  console.log(JSON.stringify(u, null, 2));
}).catch(e => {
  console.error(e.message);
}).finally(() => {
  p[disconnect]();
});
