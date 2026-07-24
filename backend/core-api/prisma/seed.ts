import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create Main User
  const user = await prisma.user.create({
    data: {
      name: 'Alex Mercer',
      avatar: 'https://i.pravatar.cc/100?img=33',
      vitals: {
        create: {
          bpm: 68,
          recoveryUpr: 0.4,
          recoveryLwr: 0.9,
          recoveryCor: 0.7,
          recoveryCrd: 0.5,
          bodyBattery: 78.5,
        }
      },
      feeds: {
        create: [
          { type: 'workout', message: 'Crushed "Leg Day V2"', timeStr: '2m ago', likes: 12, bpm: 142 },
          { type: 'ai', message: 'Analyzing your sleep data to adjust today\'s load.', timeStr: '10m ago', likes: 0 },
          { type: 'workout', message: 'Completed a 5k Run', timeStr: '1h ago', likes: 8, bpm: 156 }
        ]
      },
      workouts: {
        create: [
          {
            title: 'Hypertrophy Block A',
            duration: '45 min',
            exercises: {
              create: [
                { name: 'Barbell Squat', sets: 4, reps: 8, weight: '225 lbs' },
                { name: 'Romanian Deadlift', sets: 3, reps: 10, weight: '185 lbs' }
              ]
            }
          }
        ]
      },
      coachMessages: {
        create: [
          { role: 'ai', content: 'Good morning Alex. Based on your HRV (42ms), you are slightly under-recovered. I recommend reducing volume by 15% today.' },
          { role: 'user', content: 'Sounds good. What does the adjusted workout look like?' }
        ]
      }
    }
  })

  // Create active users for the dashboard
  const names = ['Sarah J.', 'David M.', 'Emma', 'Mike', 'Jessica']
  const avatars = [5, 11, 9, 12, 20]
  for (let i = 0; i < names.length; i++) {
    await prisma.user.create({
      data: {
        name: names[i] as string,
        avatar: `https://i.pravatar.cc/100?img=${avatars[i]}`,
      }
    })
  }

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
