import Link from '../models/Link.js';
import { generateUniqueSlug } from '../utils/generateSlug.js';

/**
 * @route   POST /api/links
 * @desc    Create a new short link
 * @access  Private
 */
export const createLink = async (req, res, next) => {
  try {
    const { title, destinationUrl, slug, expiry } = req.body;
    const userId = req.user.id;

    // Validate URL
    try {
      new URL(destinationUrl);
    } catch (error) {
      return res.json({
        success: false,
        message: 'Invalid destination URL',
      });
    }

    // Generate slug if not provided
    let finalSlug = slug?.trim();
    if (!finalSlug) {
      finalSlug = await generateUniqueSlug(Link);
    } else {
      // Check if custom slug is available
      const existingLink = await Link.findOne({ slug: finalSlug });
      if (existingLink) {
        return res.json({
          success: false,
          message: 'This slug is already taken',
        });
      }
    }

    // Create link
    const link = await Link.create({
      user: userId,
      title: title || 'Untitled Link',
      destinationUrl,
      slug: finalSlug,
      expiry: expiry || null,
    });

    res.json({
      success: true,
      data: link,
    });
  } catch (error) {
    console.log('error in createLink or updateLink::::', error);
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
    const links = await Link.find({ user: userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    // Calculate total count
    const totalCount = links.length;

    // Calculate active count (links that are active and not expired)
    const now = new Date();
    const activeCount = links.filter(link => {
      const isActive = link.isActive !== false; // Default to true if not set
      const notExpired = !link.expiry || new Date(link.expiry) > now;
      return isActive && notExpired;
    }).length;

    res.json({
      success: true,
      count: totalCount,
      total: totalCount,
      active: activeCount,
      data: links,
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
      data: link,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/links/:id
 * @desc    Update a link
 * @access  Private
 */
export const updateLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, destinationUrl, slug, expiry } = req.body;

    let link = await Link.findOne({ _id: id, user: userId });

    if (!link) {
      return res.json({
        success: false,
        message: 'Link not found',
      });
    }

    // Update fields - if field is not in req.body, it means user removed it, so set to empty
    // If field is in req.body (even if empty/null), update it
    
    // Title: optional field - if not in request, set to empty
    if ('title' in req.body) {
      link.title = (title !== undefined && title !== null) ? title : '';
    } else {
      // Field not sent - user removed it, set to empty
      link.title = '';
    }
    
    // Destination URL: required field but can be cleared if user removes it
    if ('destinationUrl' in req.body) {
      // If empty string is provided, set it to empty
      if (destinationUrl === '' || destinationUrl === null || destinationUrl === undefined) {
        link.destinationUrl = '';
      } else {
        // Validate URL format if provided
        try {
          new URL(destinationUrl);
          link.destinationUrl = destinationUrl;
        } catch (error) {
          return res.json({
            success: false,
            message: 'Invalid destination URL',
          });
        }
      }
    } else {
      // Field not sent - user removed it, set to empty
      link.destinationUrl = '';
    }
    
    // Slug: handle slug update or auto-generation
    if ('slug' in req.body) {
      // If slug is empty, null, or undefined, generate a new unique slug
      if (!slug || slug === '' || slug === null || slug === undefined) {
        const newSlug = await generateUniqueSlug(Link);
        link.slug = newSlug;
      } else if (slug !== link.slug) {
        // If a new slug is provided, validate it's available
        const existingLink = await Link.findOne({ slug });
        if (existingLink) {
          return res.json({
            success: false,
            message: 'This slug is already taken',
          });
        }
        link.slug = slug;
      }
      // If slug is same as existing, no change needed
    } else {
      // Field not sent - user removed custom slug, generate a new unique slug
      const newSlug = await generateUniqueSlug(Link);
      link.slug = newSlug;
    }
    
    // Expiry: optional field - if not in request, set to null (empty)
    if ('expiry' in req.body) {
      link.expiry = expiry || null;
    } else {
      // Field not sent - user removed it, set to null
      link.expiry = null;
    }

    await link.save();

    res.json({
      success: true,
      data: link,
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

    const link = await Link.findOne({ _id: id, user: userId });

    if (!link) {
      return res.json({
        success: false,
        message: 'Link not found',
      });
    }

    await Link.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Link deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/links/slug/:slug
 * @desc    Get link by slug (for redirect)
 * @access  Public
 */
export const getLinkBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const link = await Link.findOne({ slug });

    if (!link) {
      return res.json({
        success: false,
        message: 'Link not found',
      });
    }

    // Check if link is active
    if (!link.isActive) {
      return res.json({
        success: false,
        message: 'This link is no longer active',
      });
    }

    // Check if link has expired
    if (link.expiry && new Date(link.expiry) < new Date()) {
      link.isActive = false;
      await link.save();
      return res.json({
        success: false,
        message: 'This link has expired',
      });
    }

    res.json({
      success: true,
      data: {
        _id: link._id,
        id: link._id,
        title: link.title,
        destinationUrl: link.destinationUrl,
        slug: link.slug,
        clicks: link.clicks,
        expiry: link.expiry,
        isActive: link.isActive,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
