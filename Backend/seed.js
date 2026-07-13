import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Profile from './models/Profile.js';
import Transaction from './models/Transaction.js';

dotenv.config();

const usersData = [
  {
    name: 'Nexus Admin',
    email: 'admin@nexus.com',
    password: 'AdminPassword123',
    role: 'admin',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff',
    bio: 'System Administrator for Nexus Collaboration Platform.'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@techwave.io',
    password: 'Password123',
    role: 'entrepreneur',
    avatarUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    bio: 'Serial entrepreneur with 10+ years of experience in SaaS and fintech.',
    profile: {
      startupName: 'TechWave AI',
      pitchSummary: 'AI-powered financial analytics platform helping SMBs make data-driven decisions.',
      fundingStage: 'Seed',
      industry: 'FinTech',
      foundedYear: 2021,
      teamSize: 12,
      location: 'San Francisco, CA',
      website: 'https://techwave.io',
      skills: ['AI', 'SaaS', 'Finance']
    }
  },
  {
    name: 'David Chen',
    email: 'david@greenlife.co',
    password: 'Password123',
    role: 'entrepreneur',
    avatarUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
    bio: 'Environmental scientist turned entrepreneur. Passionate about sustainable solutions.',
    profile: {
      startupName: 'GreenLife Solutions',
      pitchSummary: 'Biodegradable packaging alternatives for consumer goods and food industry.',
      fundingStage: 'Pre-seed',
      industry: 'CleanTech',
      foundedYear: 2020,
      teamSize: 8,
      location: 'Portland, OR',
      website: 'https://greenlife.co',
      skills: ['CleanTech', 'Bioplastics', 'Operations']
    }
  },
  {
    name: 'Jennifer Lee',
    email: 'jennifer@impactvc.org',
    password: 'Password123',
    role: 'investor',
    avatarUrl: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
    bio: 'Impact investor focused on climate tech, sustainable agriculture, and clean energy.',
    profile: {
      investmentInterests: ['CleanTech', 'AgTech', 'Sustainability'],
      investmentStage: ['Seed', 'Series A', 'Series B'],
      portfolioCompanies: ['SolarFlow', 'EcoPackage', 'CleanWater Solutions'],
      minimumInvestment: 500000,
      maximumInvestment: 3000000,
      totalInvestmentsCount: 18,
      location: 'Seattle, WA',
      website: 'https://impactvc.org'
    }
  },
  {
    name: 'Michael Rodriguez',
    email: 'michael@vcinnovate.com',
    password: 'Password123',
    role: 'investor',
    avatarUrl: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    bio: 'Early-stage investor with focus on B2B SaaS and fintech. Previously founded and exited two startups.',
    profile: {
      investmentInterests: ['FinTech', 'SaaS', 'AI/ML'],
      investmentStage: ['Seed', 'Series A'],
      portfolioCompanies: ['PayStream', 'DataSense', 'CloudSecure'],
      minimumInvestment: 250000,
      maximumInvestment: 1500000,
      totalInvestmentsCount: 12,
      location: 'Miami, FL',
      website: 'https://vcinnovate.com'
    }
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexus';
    console.log(`Connecting to database...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const emails = usersData.map(u => u.email);
    const existingUsers = await User.find({ email: { $in: emails } });
    const existingUserIds = existingUsers.map(u => u._id);

    await User.deleteMany({ email: { $in: emails } });
    await Profile.deleteMany({ user: { $in: existingUserIds } });
    await Transaction.deleteMany({ user: { $in: existingUserIds } });

    console.log('🧹 Cleared existing seed users, profiles, and transactions');

    for (const u of usersData) {
      const user = await User.create({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        avatarUrl: u.avatarUrl,
        bio: u.bio
      });

      await Profile.create({
        user: user._id,
        ...u.profile
      });

      await Transaction.create({
        user: user._id,
        type: 'deposit',
        amount: u.role === 'investor' ? 150000 : 50000,
        status: 'completed',
        description: 'Initial Wallet Balance'
      });

      console.log(`👤 Created user: ${user.name} (${user.role})`);
    }

    console.log('✨ Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
