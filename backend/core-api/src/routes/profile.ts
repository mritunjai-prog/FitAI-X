import { Router } from 'express'
import prisma from '../db'

const router = Router()

// GET /api/v1/profile
router.get('/', async (req, res) => {
  try {
    let vitals = null;
    try {
      vitals = await prisma.vitals.findFirst()
    } catch (dbError) {
      console.warn("DB not reachable, using mock vitals", dbError);
    }
    
    // Transform for radar chart expectations
    const recoveryData = vitals ? [
      { subject: 'UPR', A: vitals.recoveryUpr, fullMark: 100 },
      { subject: 'LWR', A: vitals.recoveryLwr, fullMark: 100 },
      { subject: 'COR', A: vitals.recoveryCor, fullMark: 100 },
      { subject: 'CRD', A: vitals.recoveryCrd, fullMark: 100 }
    ] : [
      { subject: 'Chest', A: 85, fullMark: 100 },
      { subject: 'Back', A: 70, fullMark: 100 },
      { subject: 'Legs', A: 90, fullMark: 100 },
      { subject: 'Arms', A: 80, fullMark: 100 },
      { subject: 'Core', A: 85, fullMark: 100 }
    ];
    
    // Mock Profile Data based on BRD
    const profileData = {
      identity: {
        name: 'Alex Mercer',
        email: 'alex.mercer@elite.fit',
        avatar: 'https://i.pravatar.cc/150?img=11',
        totalWorkouts: 142,
        currentStreak: 24,
      },
      fitnessProfile: {
        height: 185, // cm
        weight: 82,  // kg
        age: 29,
        goals: ['Hypertrophy', 'Endurance', 'Power', 'Lean Mass'],
        activeGoals: ['Hypertrophy'] // Selected goals
      },
      telemetry: {
        oura: { status: 'connected', battery: 84 },
        polar: { status: 'searching' },
        appleWatch: { status: 'disconnected' }
      },
      aiPreferences: {
        adaptiveProgression: true,
        voiceFeedback: false,
        nutritionSync: true
      },
      equipment: {
        commercialGym: true,
        homeGym: false,
        dumbbellsOnly: false
      },
      settings: {
        publicProfile: true,
        twoFactorAuth: false,
        workoutReminders: true,
        recoveryAlerts: true
      },
      muscleBalance: recoveryData,
      injuryModel: [
        { id: 1, date: 'Mar 12', status: 'reported', part: 'Right Shoulder', desc: 'Shoulder strain reported.' },
        { id: 2, date: 'Mar 13 - Present', status: 'active', part: 'Right Shoulder', desc: 'AI routing around heavy overhead pressing.' },
        { id: 3, date: 'Apr 02 (Projected)', status: 'cleared', part: 'Right Shoulder', desc: 'Shoulder cleared for full mobility based on recovery trend.' }
      ]
    }
    
    res.json(profileData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

export default router
