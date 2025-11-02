import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Link must belong to a user'],
    index: true,
  },
  title: {
    type: String,
    trim: true,
    default: 'Untitled Link',
  },
  destinationUrl: {
    type: String,
    required: [true, 'Please provide a destination URL'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Please provide a slug'],
    unique: true,
    trim: true,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  expiry: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for faster queries
linkSchema.index({ user: 1, createdAt: -1 });
// slug index is automatically created by unique: true
linkSchema.index({ expiry: 1, isActive: 1 });

export default mongoose.model('Link', linkSchema);
