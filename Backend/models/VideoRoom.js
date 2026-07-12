import mongoose from 'mongoose';

const videoRoomSchema = new mongoose.Schema({
  roomId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  host: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Filter out soft-deleted video rooms
videoRoomSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

const VideoRoom = mongoose.model('VideoRoom', videoRoomSchema);
export default VideoRoom;
