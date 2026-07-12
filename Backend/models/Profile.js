import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true, 
    index: true 
  },
  
  // Entrepreneur specific fields
  startupName: { type: String, trim: true },
  pitchSummary: { type: String, trim: true },
  fundingStage: { 
    type: String, 
    enum: ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'] 
  },
  industry: { type: String, trim: true },
  foundedYear: { type: Number },
  teamSize: { type: Number },
  pitchDeckUrl: { type: String },
  revenue: { type: Number },
  vision: { type: String },

  // Investor specific fields
  investmentInterests: [{ type: String }],
  investmentStage: [{ type: String }],
  portfolioCompanies: [{ type: String }],
  minimumInvestment: { type: Number },
  maximumInvestment: { type: Number },
  totalInvestmentsCount: { type: Number, default: 0 },

  // Shared settings
  location: { type: String, trim: true },
  website: { type: String, trim: true },
  linkedIn: { type: String, trim: true },
  socialLinks: {
    twitter: { type: String, trim: true },
    github: { type: String, trim: true }
  },
  skills: [{ type: String }],
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Filter out soft-deleted profiles
profileSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

const Profile = mongoose.model('Profile', profileSchema);
export default Profile;
