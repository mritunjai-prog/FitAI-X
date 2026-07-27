CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT
);

CREATE TABLE IF NOT EXISTS "Vitals" (
  id TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL,
  bpm INT NOT NULL,
  "recoveryUpr" FLOAT NOT NULL,
  "recoveryLwr" FLOAT NOT NULL,
  "recoveryCor" FLOAT NOT NULL,
  "recoveryCrd" FLOAT NOT NULL,
  "bodyBattery" FLOAT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"(id)
);

CREATE TABLE IF NOT EXISTS "FeedItem" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  "timeStr" TEXT NOT NULL,
  likes INT DEFAULT 0,
  bpm INT,
  FOREIGN KEY ("userId") REFERENCES "User"(id)
);

CREATE TABLE IF NOT EXISTS "Workout" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  title TEXT NOT NULL,
  duration TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"(id)
);

CREATE TABLE IF NOT EXISTS "Exercise" (
  id TEXT PRIMARY KEY,
  "workoutId" TEXT NOT NULL,
  name TEXT NOT NULL,
  sets INT NOT NULL,
  reps INT NOT NULL,
  weight TEXT NOT NULL,
  FOREIGN KEY ("workoutId") REFERENCES "Workout"(id)
);

CREATE TABLE IF NOT EXISTS "CoachMessage" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"(id)
);

-- Seed data
INSERT INTO "User" (id, name, avatar) VALUES
  ('user-alex', 'Alex Mercer', 'https://i.pravatar.cc/100?img=33'),
  ('user-sarah', 'Sarah', 'https://i.pravatar.cc/100?img=47'),
  ('user-mike', 'Mike', 'https://i.pravatar.cc/100?img=12'),
  ('user-emma', 'Emma', 'https://i.pravatar.cc/100?img=25'),
  ('user-chris', 'Chris', 'https://i.pravatar.cc/100?img=8')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Vitals" (id, "userId", bpm, "recoveryUpr", "recoveryLwr", "recoveryCor", "recoveryCrd", "bodyBattery") VALUES
  ('vitals-alex', 'user-alex', 68, 0.4, 0.9, 0.7, 0.5, 85.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "FeedItem" (id, "userId", type, message, "timeStr", likes, bpm) VALUES
  ('feed-1', 'user-sarah', 'workout', 'Crushed leg day! 💪 New PR on squats.', '2m ago', 12, 145),
  ('feed-2', 'user-alex', 'ai', 'Rachel AI: Your recovery score jumped 15pts overnight. Pushing intensity today.', '5m ago', 0, NULL),
  ('feed-3', 'user-mike', 'workout', 'Morning run complete. 5.2km in 28min 🏃', '12m ago', 8, 162)
ON CONFLICT (id) DO NOTHING;
