import request from 'supertest';
import { app } from '../src/index';
import { prismaMock } from './setup';

describe('Auth API Endpoints', () => {
  it('should successfully sign up a new user', async () => {
    // Mock the user.findUnique to return null (user doesn't exist)
    (prismaMock.user.findUnique as any).mockResolvedValue(null);
    
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      avatar: 'https://i.pravatar.cc/100',
      fitnessGoal: 'Lose weight',
      activityLevel: 'Active',
      dietaryPreference: 'None',
      injuryHistory: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock the user.create to return the newly created user
    (prismaMock.user.create as any).mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 'test-user-id');
    expect(response.body).toHaveProperty('email', 'test@example.com');
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
  });

  it('should return error if email already exists', async () => {
    const mockUser = {
      id: 'existing-id',
      email: 'test@example.com',
      password: 'password123',
      name: 'Existing User',
      avatar: 'https://i.pravatar.cc/100',
      fitnessGoal: null,
      activityLevel: null,
      dietaryPreference: null,
      injuryHistory: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock findUnique to return an existing user
    (prismaMock.user.findUnique as any).mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Email already exists');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
