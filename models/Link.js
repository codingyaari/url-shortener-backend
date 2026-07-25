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
    maxlength: 120,
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
    lowercase: true,
    maxlength: 64,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
    maxlength: 500,
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: (v) => Array.isArray(v) && v.length <= 10,
      message: 'Maximum 10 tags allowed',
    },
  },
  passwordHash: {
    type: String,
    default: null,
    select: false,
  },
  hasPassword: {
    type: Boolean,
    default: false,
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
  isFavorite: {
    type: Boolean,
    default: false,
    index: true,
  },
  showOnBio: {
    type: Boolean,
    default: true,
  },
  utmSource: {
    type: String,
    trim: true,
    default: '',
  },
  utmMedium: {
    type: String,
    trim: true,
    default: '',
  },
  utmCampaign: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    },
  },
});

linkSchema.index({ user: 1, createdAt: -1 });
linkSchema.index({ expiry: 1, isActive: 1 });
linkSchema.index({ user: 1, tags: 1 });
linkSchema.index({ user: 1, isFavorite: -1, createdAt: -1 });

export default mongoose.model('Link', linkSchema);
