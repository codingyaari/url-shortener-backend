import bcrypt from 'bcryptjs';
import Link from '../models/Link.js';
import { generateUniqueSlug } from '../utils/generateSlug.js';

const FREE_LINK_LIMIT = Number(process.env.FREE_LINK_LIMIT || 50);

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10)
  )];
};

const trimUtm = (value) => String(value || '').trim().slice(0, 100);

const publicLinkPayload = (link, extras = {}) => ({
  _id: link._id,
  id: link._id,
  title: link.title,
  destinationUrl: extras.includeDestination === false ? undefined : link.destinationUrl,
  slug: link.slug,
  notes: link.notes,
  tags: link.tags,
  clicks: link.clicks,
  expiry: link.expiry,
  isActive: link.isActive,
  isFavorite: Boolean(link.isFavorite),
  showOnBio: link.showOnBio !== false,
  utmSource: link.utmSource || '',
  utmMedium: link.utmMedium || '',
  utmCampaign: link.utmCampaign || '',
  hasPassword: Boolean(link.hasPassword || link.passwordHash),
  createdAt: link.createdAt,
  updatedAt: link.updatedAt,
  ...extras.fields,
});

/**
 * @route   POST /api/links
 * @desc    Create a new short link
 * @access  Private
 */
export const createLink = async (req, res, next) => {
  try {
    const {
      title, destinationUrl, slug, expiry, notes, tags, password, isActive,
      isFavorite, showOnBio, utmSource, utmMedium, utmCampaign,
    } = req.body;
    const userId = req.user.id;

    if (!destinationUrl || !isHttpUrl(destinationUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid http(s) destination URL',
      });
    }

    const existingCount = await Link.countDocuments({ user: userId });
    if (existingCount >= FREE_LINK_LIMIT) {
      return res.status(403).json({
        success: false,
        message: `Free plan limit reached (${FREE_LINK_LIMIT} links). Upgrade to Pro for unlimited links.`,
        code: 'PLAN_LIMIT',
        limit: FREE_LINK_LIMIT,
      });
    }

    let finalSlug = slug?.trim()?.toLowerCase();
    if (!finalSlug) {
      finalSlug = await generateUniqueSlug(Link);
    } else {
      if (!/^[a-z0-9_-]+$/.test(finalSlug)) {
        return res.status(400).json({
          success: false,
          message: 'Slug can only contain letters, numbers, hyphens, and underscores',
        });
      }
      const existingLink = await Link.findOne({ slug: finalSlug });
      if (existingLink) {
        return res.status(409).json({
          success: false,
          message: 'This slug is already taken',
        });
      }
    }

    let passwordHash = null;
    let hasPassword = false;
    if (password && String(password).length > 0) {
      if (String(password).length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 4 characters',
        });
      }
      passwordHash = await bcrypt.hash(String(password), 10);
      hasPassword = true;
    }

    const link = await Link.create({
      user: userId,
      title: title?.trim() || 'Untitled Link',
      destinationUrl,
      slug: finalSlug,
      notes: notes?.trim() || '',
      tags: normalizeTags(tags),
      passwordHash,
      hasPassword,
      expiry: expiry || null,
      isActive: isActive !== false,
      isFavorite: Boolean(isFavorite),
      showOnBio: showOnBio !== false,
      utmSource: trimUtm(utmSource),
      utmMedium: trimUtm(utmMedium),
      utmCampaign: trimUtm(utmCampaign),
    });

    res.status(201).json({
      success: true,
      data: publicLinkPayload(link),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/links
 * @desc    Get all links for current user
 * @access  Private
 */
export const getLinks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q, tag, status, favorite } = req.query;

    const filter = { user: userId };
    if (tag) filter.tags = String(tag).toLowerCase();
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (favorite === 'true' || favorite === '1') filter.isFavorite = true;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
        { destinationUrl: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
      ];
    }

    const links = await Link.find(filter)
      .sort({ createdAt: -1 })
      .select('-__v -passwordHash');

    const now = new Date();
    const activeCount = links.filter((link) => {
      const notExpired = !link.expiry || new Date(link.expiry) > now;
      return link.isActive !== false && notExpired;
    }).length;

    const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);

    res.status(200).json({
      success: true,
      count: links.length,
      total: links.length,
      active: activeCount,
      totalClicks,
      plan: {
        name: 'free',
        linkLimit: FREE_LINK_LIMIT,
        linksUsed: await Link.countDocuments({ user: userId }),
      },
      data: links.map((link) => publicLinkPayload(link)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/links/stats/overview
 * @desc    Dashboard overview stats
 * @access  Private
 */
export const getOverviewStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const links = await Link.find({ user: userId }).select('clicks isActive expiry createdAt');
    const now = new Date();
    const active = links.filter((l) => l.isActive && (!l.expiry || new Date(l.expiry) > now)).length;
    const totalClicks = links.reduce((s, l) => s + (l.clicks || 0), 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const createdThisWeek = links.filter((l) => new Date(l.createdAt) >= weekAgo).length;

    res.status(200).json({
      success: true,
      data: {
        totalLinks: links.length,
        activeLinks: active,
        totalClicks,
        createdThisWeek,
        linkLimit: FREE_LINK_LIMIT,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/links/:id
 * @desc    Get a single link
 * @access  Private
 */
export const getLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const link = await Link.findOne({ _id: id, user: userId });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found',
      });
    }

    res.status(200).json({
      success: true,
      data: publicLinkPayload(link),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/links/:id
 * @desc    Update a link (partial)
 * @access  Private
 */
export const updateLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title, destinationUrl, slug, expiry, notes, tags, password, clearPassword, isActive,
      isFavorite, showOnBio, utmSource, utmMedium, utmCampaign,
    } = req.body;

    const link = await Link.findOne({ _id: id, user: userId }).select('+passwordHash');

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found',
      });
    }

    if (title !== undefined) link.title = String(title).trim() || 'Untitled Link';
    if (notes !== undefined) link.notes = String(notes).trim().slice(0, 500);
    if (tags !== undefined) link.tags = normalizeTags(tags);
    if (isActive !== undefined) link.isActive = Boolean(isActive);
    if (expiry !== undefined) link.expiry = expiry || null;
    if (isFavorite !== undefined) link.isFavorite = Boolean(isFavorite);
    if (showOnBio !== undefined) link.showOnBio = Boolean(showOnBio);
    if (utmSource !== undefined) link.utmSource = trimUtm(utmSource);
    if (utmMedium !== undefined) link.utmMedium = trimUtm(utmMedium);
    if (utmCampaign !== undefined) link.utmCampaign = trimUtm(utmCampaign);

    if (destinationUrl !== undefined) {
      if (!destinationUrl || !isHttpUrl(destinationUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid http(s) destination URL',
        });
      }
      link.destinationUrl = destinationUrl;
    }

    if (slug !== undefined) {
      const nextSlug = String(slug).trim().toLowerCase();
      if (!nextSlug) {
        link.slug = await generateUniqueSlug(Link);
      } else if (nextSlug !== link.slug) {
        if (!/^[a-z0-9_-]+$/.test(nextSlug)) {
          return res.status(400).json({
            success: false,
            message: 'Slug can only contain letters, numbers, hyphens, and underscores',
          });
        }
        const existingLink = await Link.findOne({ slug: nextSlug });
        if (existingLink) {
          return res.status(409).json({
            success: false,
            message: 'This slug is already taken',
          });
        }
        link.slug = nextSlug;
      }
    }

    if (clearPassword) {
      link.passwordHash = null;
      link.hasPassword = false;
    } else if (password !== undefined && String(password).length > 0) {
      if (String(password).length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 4 characters',
        });
      }
      link.passwordHash = await bcrypt.hash(String(password), 10);
      link.hasPassword = true;
    }

    await link.save();

    res.status(200).json({
      success: true,
      data: publicLinkPayload(link),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/links/:id
 * @desc    Delete a link
 * @access  Private
 */
export const deleteLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const link = await Link.findOneAndDelete({ _id: id, user: userId });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Link deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/links/slug/:slug
 * @desc    Resolve link metadata for redirect UI
 * @access  Public
 */
export const getLinkBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const link = await Link.findOne({ slug: String(slug).toLowerCase() }).select('+passwordHash');

    if (!link) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }

    if (!link.isActive) {
      return res.status(403).json({ success: false, message: 'This link is no longer active' });
    }

    if (link.expiry && new Date(link.expiry) < new Date()) {
      link.isActive = false;
      await link.save();
      return res.status(410).json({ success: false, message: 'This link has expired' });
    }

    const locked = Boolean(link.passwordHash);
    res.status(200).json({
      success: true,
      data: publicLinkPayload(link, {
        includeDestination: !locked,
        fields: locked ? { requiresPassword: true } : {},
      }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/links/slug/:slug/unlock
 * @desc    Unlock password-protected link
 * @access  Public
 */
export const unlockLinkBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;
    const link = await Link.findOne({ slug: String(slug).toLowerCase() }).select('+passwordHash');

    if (!link || !link.isActive) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }

    if (link.expiry && new Date(link.expiry) < new Date()) {
      return res.status(410).json({ success: false, message: 'This link has expired' });
    }

    if (!link.passwordHash) {
      return res.status(200).json({ success: true, data: publicLinkPayload(link) });
    }

    const ok = await bcrypt.compare(String(password || ''), link.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    res.status(200).json({
      success: true,
      data: publicLinkPayload(link),
    });
  } catch (error) {
    next(error);
  }
};
