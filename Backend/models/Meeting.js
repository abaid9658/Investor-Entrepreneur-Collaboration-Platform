import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  host: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  attendee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'rescheduled'], 
    default: 'pending' 
  },
  meetingLink: { type: String },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Filter out soft-deleted records
meetingSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

// Indexes to detect double bookings and speed up dashboard lists
meetingSchema.index({ host: 1, startTime: 1, endTime: 1 });
meetingSchema.index({ attendee: 1, startTime: 1, endTime: 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
