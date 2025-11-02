import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
  link: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link',
    required: [true, 'Click must belong to a link'],
    index: true,
  },
  // Note: We don't store link owner here - this is for the clicker (visitor) if we can identify them
  // For public links, clickers are anonymous, so user will be null
  clickerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  clickerEmail: {
    type: String,
    default: null,
  },
  ip: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    default: 'Unknown',
  },
  city: {
    type: String,
    default: 'Unknown',
  },
  region: {
    type: String,
    default: null,
  },
  state: {
    type: String,
    default: null,
  },
  postalCode: {
    type: String,
    default: null,
  },
  device: {
    type: String,
    enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
    default: 'Unknown',
  },
  browser: {
    type: String,
    default: 'Unknown',
  },
  os: {
    type: String,
    default: 'Unknown',
  },
  referrer: {
    type: String,
    default: 'Direct',
  },
  userAgent: {
    type: String,
  },
  // Additional analytics data
  screenResolution: {
    type: String,
    default: 'Unknown',
  },
  viewportSize: {
    type: String,
    default: 'Unknown',
  },
  language: {
    type: String,
    default: 'Unknown',
  },
  timezone: {
    type: String,
    default: 'Unknown',
  },
  utmSource: {
    type: String,
    default: null,
  },
  utmMedium: {
    type: String,
    default: null,
  },
  utmCampaign: {
    type: String,
    default: null,
  },
  sessionId: {
    type: String,
    default: null,
  },
  latitude: {
    type: Number,
    default: null,
  },
  longitude: {
    type: Number,
    default: null,
  },
  isp: {
    type: String,
    default: 'Unknown',
  },
  hourOfDay: {
    type: Number,
    default: null,
  },
  dayOfWeek: {
    type: Number, // 0 = Sunday, 6 = Saturday
    default: null,
  },
}, {
  timestamps: true,
});

// Index for faster analytics queries
clickSchema.index({ link: 1, createdAt: -1 });
clickSchema.index({ createdAt: -1 });
clickSchema.index({ link: 1, country: 1 });
clickSchema.index({ link: 1, device: 1 });
clickSchema.index({ link: 1, hourOfDay: 1 });
clickSchema.index({ link: 1, dayOfWeek: 1 });
clickSchema.index({ link: 1, utmSource: 1 });
clickSchema.index({ link: 1, language: 1 });

export default mongoose.model('Click', clickSchema);
