import Click from '../models/Click.js';
import Link from '../models/Link.js';
import User from '../models/User.js';
import { detectDevice, detectBrowser, detectOS } from '../utils/detectDevice.js';
import { getLocationFromIP, getClientIP } from '../utils/ipGeolocation.js';
import jwt from 'jsonwebtoken';

/**
 * @route   POST /api/clicks
 * @desc    Track a click on a link
 * @access  Public
 */
export const trackClick = async (req, res, next) => {
  try {
    const {
      linkId,
      screenResolution,
      viewportSize,
      language,
      timezone,
      utmSource,
      utmMedium,
      utmCampaign,
      sessionId,
      connectionType,
    } = req.body;

    // Get client IP (handles proxies/load balancers)
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers.referer || req.headers.referrer || 'Direct';

    // Get link
    const link = await Link.findById(linkId);
    if (!link) {
      return res.json({
        success: false,
        message: 'Link not found',
      });
    }

    // Check if link is active and not expired
    if (!link.isActive) {
      return res.json({
        success: false,
        message: 'Link is not active',
      });
    }

    if (link.expiry && new Date(link.expiry) < new Date()) {
      return res.json({
        success: false,
        message: 'Link has expired',
      });
    }

    // Detect device info
    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);
    const os = detectOS(userAgent);

    // Get location from IP (async, but don't block if it fails)
    // This gives us city, region, state, postal code for the clicker (visitor)
    let location = { 
      country: 'Unknown', 
      city: 'Unknown', 
      region: null,
      state: null,
      postalCode: null,
      lat: null, 
      lon: null, 
      isp: 'Unknown' 
    };
    try {
      console.log(`Attempting to get location for IP: ${ip}`);
      location = await getLocationFromIP(ip);
      console.log(`Location result for IP ${ip}:`, location);
    } catch (error) {
      console.error('Failed to get location from IP:', error);
      // Continue with defaults
    }
  
    // Get current date/time for analytics
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Create click record
    // Note: We don't store link owner info - only clicker (visitor) info if available
    const click = await Click.create({
      link: linkId,
      ip,
      country: location.country,
      city: location.city,          // Clicker's city from IP geolocation
      region: location.region,      // Clicker's region/state
      state: location.state,        // Clicker's state
      postalCode: location.postalCode, // Clicker's postal code
      latitude: location.lat,
      longitude: location.lon,
      isp: location.isp,
      device,
      browser,
      os,
      referrer,
      userAgent,
      screenResolution: screenResolution || 'Unknown',
      viewportSize: viewportSize || 'Unknown',
      language: language || 'Unknown',
      timezone: timezone || 'Unknown',
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      sessionId: sessionId || null,
      hourOfDay,
      dayOfWeek,
    });

    // Increment click count on link
    link.clicks += 1;
    await link.save();

    res.json({
      success: true,
      data: click,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/links/slug/:slug/analytics
 * @desc    Get analytics for a specific link by slug (using aggregation)
 * @access  Private
 */
export const getLinkAnalyticsBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;

    // Find link by slug and verify it belongs to user
    const link = await Link.findOne({ slug, user: userId });
    if (!link) {
      return res.json({
        success: false,
        message: 'Link not found',
      });
    }

    // Get all clicks for this link using aggregation for better performance
    const clicks = await Click.find({ link: link._id }).sort({ createdAt: -1 });

    // Aggregate analytics
    const analytics = {
      totalClicks: clicks.length,
      clicksByCountry: {},
      clicksByDevice: {},
      clicksByBrowser: {},
      clicksByOS: {},
      clicksByLanguage: {},
      clicksByHour: {},
      clicksByDayOfWeek: {},
      clicksByScreenResolution: {},
      clicksByReferrer: {},
      clicksByUTMSource: {},
      clicksOverTime: [],
      topCountries: [],
      topCities: [],
      recentClicks: clicks.slice(0, 100).map(click => ({
        id: click._id,
        timestamp: click.createdAt,
        ip: click.ip,
        country: click.country,
        city: click.city,           // Clicker's city
        region: click.region,        // Clicker's region
        state: click.state,         // Clicker's state
        postalCode: click.postalCode, // Clicker's postal code
        clickerUserId: click.clickerUserId, // Clicker's user ID (if logged in)
        clickerEmail: click.clickerEmail,   // Clicker's email (if logged in, null for anonymous)
        device: click.device,
        browser: click.browser,
        os: click.os,
        referrer: click.referrer,
        language: click.language,
        screenResolution: click.screenResolution,
        utmSource: click.utmSource,
        hourOfDay: click.hourOfDay,
        latitude: click.latitude,
        longitude: click.longitude,
        isp: click.isp,
      })),
    };

    // Calculate distributions
    const countryCount = {};
    const cityCount = {};

    clicks.forEach(click => {
      // Country distribution
      analytics.clicksByCountry[click.country] =
        (analytics.clicksByCountry[click.country] || 0) + 1;

      // City count (for top cities)
      if (click.city && click.city !== 'Unknown') {
        cityCount[click.city] = (cityCount[click.city] || 0) + 1;
      }
      countryCount[click.country] = (countryCount[click.country] || 0) + 1;

      // Device distribution
      analytics.clicksByDevice[click.device] =
        (analytics.clicksByDevice[click.device] || 0) + 1;

      // Browser distribution
      analytics.clicksByBrowser[click.browser] =
        (analytics.clicksByBrowser[click.browser] || 0) + 1;

      // OS distribution
      analytics.clicksByOS[click.os] =
        (analytics.clicksByOS[click.os] || 0) + 1;

      // Language distribution
      if (click.language) {
        analytics.clicksByLanguage[click.language] =
          (analytics.clicksByLanguage[click.language] || 0) + 1;
      }

      // Hour of day distribution
      if (click.hourOfDay !== null && click.hourOfDay !== undefined) {
        analytics.clicksByHour[click.hourOfDay] =
          (analytics.clicksByHour[click.hourOfDay] || 0) + 1;
      }

      // Day of week distribution
      if (click.dayOfWeek !== null && click.dayOfWeek !== undefined) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[click.dayOfWeek];
        analytics.clicksByDayOfWeek[dayName] =
          (analytics.clicksByDayOfWeek[dayName] || 0) + 1;
      }

      // Screen resolution distribution
      if (click.screenResolution && click.screenResolution !== 'Unknown') {
        analytics.clicksByScreenResolution[click.screenResolution] =
          (analytics.clicksByScreenResolution[click.screenResolution] || 0) + 1;
      }

      // Referrer distribution
      const ref = click.referrer === 'Direct' ? 'Direct' :
        click.referrer ? new URL(click.referrer).hostname : 'Direct';
      analytics.clicksByReferrer[ref] =
        (analytics.clicksByReferrer[ref] || 0) + 1;

      // UTM Source distribution
      if (click.utmSource) {
        analytics.clicksByUTMSource[click.utmSource] =
          (analytics.clicksByUTMSource[click.utmSource] || 0) + 1;
      }
    });

    // Get top countries and cities
    analytics.topCountries = Object.entries(countryCount)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    analytics.topCities = Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate clicks over time (group by date, and by hour if single day)
    const clicksOverTimeMap = {};
    const clicksByHourMap = {}; // For hourly breakdown when needed
    
    clicks.forEach(click => {
      const date = new Date(click.createdAt).toISOString().split('T')[0];
      clicksOverTimeMap[date] = (clicksOverTimeMap[date] || 0) + 1;
      
      // Also track by hour for detailed breakdown
      const hour = new Date(click.createdAt).getHours();
      const hourKey = `${date}-${hour}`;
      clicksByHourMap[hourKey] = (clicksByHourMap[hourKey] || 0) + 1;
    });

    const uniqueDates = Object.keys(clicksOverTimeMap).length;
    
    // If only one date, provide hourly breakdown for better visualization
    if (uniqueDates === 1) {
      const singleDate = Object.keys(clicksOverTimeMap)[0];
      analytics.clicksOverTime = [];
      
      // Show all 24 hours for better graph visualization
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = `${singleDate}-${hour}`;
        const count = clicksByHourMap[hourKey] || 0;
        analytics.clicksOverTime.push({
          date: singleDate,
          hour: hour,
          count: count,
          label: `${hour.toString().padStart(2, '0')}:00`
        });
      }
    } else {
      // Multiple dates - use daily grouping
      analytics.clicksOverTime = Object.entries(clicksOverTimeMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    res.json({
      success: true,
      data: {
        link: {
          _id: link._id,
          title: link.title,
          slug: link.slug,
          destinationUrl: link.destinationUrl,
          clicks: link.clicks,
          expiry: link.expiry,
          isActive: link.isActive,
          createdAt: link.createdAt,
        },
        analytics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/links/:id/analytics
 * @desc    Get analytics for a specific link by ID
 * @access  Private
 */
export const getLinkAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify link belongs to user
    const link = await Link.findOne({ _id: id, user: userId });
    if (!link) {
      return res.json({
        success: false,
        message: 'Link not found',
      });
    }

    // Get all clicks for this link
    const clicks = await Click.find({ link: id }).sort({ createdAt: -1 });

    // Aggregate analytics
    const analytics = {
      totalClicks: clicks.length,
      clicksByCountry: {},
      clicksByDevice: {},
      clicksByBrowser: {},
      clicksByOS: {},
      clicksByLanguage: {},
      clicksByHour: {},
      clicksByDayOfWeek: {},
      clicksByScreenResolution: {},
      clicksByReferrer: {},
      clicksByUTMSource: {},
      clicksOverTime: [],
      topCountries: [],
      topCities: [],
      recentClicks: clicks.slice(0, 100).map(click => ({
        id: click._id,
        timestamp: click.createdAt,
        ip: click.ip,
        country: click.country,
        city: click.city,
        region: click.region,
        state: click.state,
        postalCode: click.postalCode,
        clickerUserId: click.clickerUserId,
        clickerEmail: click.clickerEmail,
        device: click.device,
        browser: click.browser,
        os: click.os,
        referrer: click.referrer,
        language: click.language,
        screenResolution: click.screenResolution,
        utmSource: click.utmSource,
        hourOfDay: click.hourOfDay,
        latitude: click.latitude,
        longitude: click.longitude,
        isp: click.isp,
      })),
    };

    // Calculate distributions
    const countryCount = {};
    const cityCount = {};

    clicks.forEach(click => {
      // Country distribution
      analytics.clicksByCountry[click.country] =
        (analytics.clicksByCountry[click.country] || 0) + 1;

      // City count (for top cities)
      if (click.city && click.city !== 'Unknown') {
        cityCount[click.city] = (cityCount[click.city] || 0) + 1;
      }
      countryCount[click.country] = (countryCount[click.country] || 0) + 1;

      // Device distribution
      analytics.clicksByDevice[click.device] =
        (analytics.clicksByDevice[click.device] || 0) + 1;

      // Browser distribution
      analytics.clicksByBrowser[click.browser] =
        (analytics.clicksByBrowser[click.browser] || 0) + 1;

      // OS distribution
      analytics.clicksByOS[click.os] =
        (analytics.clicksByOS[click.os] || 0) + 1;

      // Language distribution
      if (click.language) {
        analytics.clicksByLanguage[click.language] =
          (analytics.clicksByLanguage[click.language] || 0) + 1;
      }

      // Hour of day distribution
      if (click.hourOfDay !== null && click.hourOfDay !== undefined) {
        analytics.clicksByHour[click.hourOfDay] =
          (analytics.clicksByHour[click.hourOfDay] || 0) + 1;
      }

      // Day of week distribution
      if (click.dayOfWeek !== null && click.dayOfWeek !== undefined) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[click.dayOfWeek];
        analytics.clicksByDayOfWeek[dayName] =
          (analytics.clicksByDayOfWeek[dayName] || 0) + 1;
      }

      // Screen resolution distribution
      if (click.screenResolution && click.screenResolution !== 'Unknown') {
        analytics.clicksByScreenResolution[click.screenResolution] =
          (analytics.clicksByScreenResolution[click.screenResolution] || 0) + 1;
      }

      // Referrer distribution
      const ref = click.referrer === 'Direct' ? 'Direct' :
        click.referrer ? new URL(click.referrer).hostname : 'Direct';
      analytics.clicksByReferrer[ref] =
        (analytics.clicksByReferrer[ref] || 0) + 1;

      // UTM Source distribution
      if (click.utmSource) {
        analytics.clicksByUTMSource[click.utmSource] =
          (analytics.clicksByUTMSource[click.utmSource] || 0) + 1;
      }
    });

    // Get top countries and cities
    analytics.topCountries = Object.entries(countryCount)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    analytics.topCities = Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate clicks over time (group by date, and by hour if single day)
    const clicksOverTimeMap = {};
    const clicksByHourMap = {}; // For hourly breakdown when needed
    
    clicks.forEach(click => {
      const date = new Date(click.createdAt).toISOString().split('T')[0];
      clicksOverTimeMap[date] = (clicksOverTimeMap[date] || 0) + 1;
      
      // Also track by hour for detailed breakdown
      const hour = new Date(click.createdAt).getHours();
      const hourKey = `${date}-${hour}`;
      clicksByHourMap[hourKey] = (clicksByHourMap[hourKey] || 0) + 1;
    });

    const uniqueDates = Object.keys(clicksOverTimeMap).length;
    
    // If only one date, provide hourly breakdown for better visualization
    if (uniqueDates === 1) {
      const singleDate = Object.keys(clicksOverTimeMap)[0];
      analytics.clicksOverTime = [];
      
      // Show all 24 hours for better graph visualization
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = `${singleDate}-${hour}`;
        const count = clicksByHourMap[hourKey] || 0;
        analytics.clicksOverTime.push({
          date: singleDate,
          hour: hour,
          count: count,
          label: `${hour.toString().padStart(2, '0')}:00`
        });
      }
    } else {
      // Multiple dates - use daily grouping
      analytics.clicksOverTime = Object.entries(clicksOverTimeMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    res.json({
      success: true,
      data: {
        link: {
          _id: link._id,
          title: link.title,
          slug: link.slug,
          destinationUrl: link.destinationUrl,
          clicks: link.clicks,
          expiry: link.expiry,
          isActive: link.isActive,
          createdAt: link.createdAt,
        },
        analytics,
      },
    });
  } catch (error) {
    next(error);
  }
};
