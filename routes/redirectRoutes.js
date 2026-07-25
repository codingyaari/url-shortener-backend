import express from 'express';
import Link from '../models/Link.js';
import Click from '../models/Click.js';
import { detectDevice, detectBrowser, detectOS } from '../utils/detectDevice.js';
import { getLocationFromIP, getClientIP } from '../utils/ipGeolocation.js';

const router = express.Router();

/**
 * Fast 302 redirect for short links.
 * GET /r/:slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const link = await Link.findOne({ slug }).select('+passwordHash');
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!link || !link.isActive) {
      return res.redirect(302, `${frontend}/?error=not_found`);
    }

    if (link.expiry && new Date(link.expiry) < new Date()) {
      link.isActive = false;
      await link.save();
      return res.redirect(302, `${frontend}/?error=expired`);
    }

    if (link.passwordHash) {
      return res.redirect(302, `${frontend}/unlock/${link.slug}`);
    }

    let destination;
    try {
      destination = new URL(link.destinationUrl);
    } catch {
      return res.redirect(302, `${frontend}/?error=invalid`);
    }

    if (!['http:', 'https:'].includes(destination.protocol)) {
      return res.redirect(302, `${frontend}/?error=invalid`);
    }

    if (link.utmSource && !destination.searchParams.has('utm_source')) {
      destination.searchParams.set('utm_source', link.utmSource);
    }
    if (link.utmMedium && !destination.searchParams.has('utm_medium')) {
      destination.searchParams.set('utm_medium', link.utmMedium);
    }
    if (link.utmCampaign && !destination.searchParams.has('utm_campaign')) {
      destination.searchParams.set('utm_campaign', link.utmCampaign);
    }

    setImmediate(async () => {
      try {
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'] || '';
        const location = await getLocationFromIP(ip).catch(() => ({}));
        await Click.create({
          link: link._id,
          ip,
          country: location.country,
          city: location.city,
          region: location.region,
          state: location.state,
          postalCode: location.postalCode,
          lat: location.lat,
          lon: location.lon,
          isp: location.isp,
          device: detectDevice(userAgent),
          browser: detectBrowser(userAgent),
          os: detectOS(userAgent),
          referrer: req.get('referer') || 'Direct',
          userAgent,
        });
        await Link.findByIdAndUpdate(link._id, { $inc: { clicks: 1 } });
      } catch (err) {
        console.error('Redirect click track failed:', err.message);
      }
    });

    return res.redirect(302, destination.href);
  } catch (error) {
    console.error('Redirect error:', error);
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(302, `${frontend}/?error=redirect`);
  }
});

export default router;
