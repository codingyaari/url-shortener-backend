import User from '../models/User.js';
import Link from '../models/Link.js';

const slugifyUsername = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 24);

export const ensureUsername = async (user) => {
  if (user.username) return user.username;
  const base = slugifyUsername(user.name?.split(' ')[0] || user.email?.split('@')[0] || 'creator') || 'creator';
  let candidate = base;
  let i = 0;
  while (await User.findOne({ username: candidate })) {
    i += 1;
    candidate = `${base}${i}`.slice(0, 32);
  }
  user.username = candidate;
  await user.save();
  return candidate;
};

/**
 * @route   GET /api/bio/:username
 * @desc    Public link-in-bio page data
 * @access  Public
 */
export const getPublicBio = async (req, res, next) => {
  try {
    const username = String(req.params.username || '').toLowerCase();
    const user = await User.findOne({ username, bioEnabled: { $ne: false } }).select(
      'name username avatar bioHeadline'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Bio page not found' });
    }

    const links = await Link.find({
      user: user._id,
      isActive: true,
      showOnBio: { $ne: false },
      hasPassword: { $ne: true },
    })
      .sort({ isFavorite: -1, clicks: -1, createdAt: -1 })
      .select('title slug clicks tags createdAt')
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        profile: {
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          headline: user.bioHeadline || 'Links worth clicking',
        },
        links: links.map((l) => ({
          id: l._id,
          title: l.title,
          slug: l.slug,
          clicks: l.clicks,
          tags: l.tags,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update bio profile settings
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await ensureUsername(user);

    if (req.body.username !== undefined) {
      const nextUsername = slugifyUsername(req.body.username);
      if (nextUsername.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
      }
      const taken = await User.findOne({ username: nextUsername, _id: { $ne: user._id } });
      if (taken) {
        return res.status(409).json({ success: false, message: 'Username already taken' });
      }
      user.username = nextUsername;
    }

    if (req.body.bioHeadline !== undefined) {
      user.bioHeadline = String(req.body.bioHeadline || '').slice(0, 160);
    }
    if (req.body.bioEnabled !== undefined) {
      user.bioEnabled = Boolean(req.body.bioEnabled);
    }
    if (req.body.name !== undefined && String(req.body.name).trim()) {
      user.name = String(req.body.name).trim().slice(0, 80);
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        username: user.username,
        bioHeadline: user.bioHeadline,
        bioEnabled: user.bioEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};
