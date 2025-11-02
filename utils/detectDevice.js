/**
 * Detect device type from user agent string
 * @param {string} userAgent - User agent string
 * @returns {string} - Device type (Desktop, Mobile, Tablet, Unknown)
 */
export const detectDevice = (userAgent) => {
  if (!userAgent) return 'Unknown';

  const ua = userAgent.toLowerCase();

  // Check for mobile devices
  const mobileRegex = /mobile|android|iphone|ipod|blackberry|opera mini|opera mobi|skyfire|maemo|windows phone|palm|iemobile|symbian|symbianos|fennec/i;
  if (mobileRegex.test(ua)) {
    // Check for tablet
    const tabletRegex = /tablet|ipad|playbook|silk|android(?!.*mobile)/i;
    if (tabletRegex.test(ua)) {
      return 'Tablet';
    }
    return 'Mobile';
  }

  // Check for desktop
  const desktopRegex = /windows|macintosh|linux|cros|freebsd|openbsd/i;
  if (desktopRegex.test(ua)) {
    return 'Desktop';
  }

  return 'Unknown';
};

/**
 * Detect browser from user agent string
 * @param {string} userAgent - User agent string
 * @returns {string} - Browser name
 */
export const detectBrowser = (userAgent) => {
  if (!userAgent) return 'Unknown';

  const ua = userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera';
  if (ua.includes('msie') || ua.includes('trident/')) return 'Internet Explorer';

  return 'Unknown';
};

/**
 * Detect operating system from user agent string
 * @param {string} userAgent - User agent string
 * @returns {string} - OS name
 */
export const detectOS = (userAgent) => {
  if (!userAgent) return 'Unknown';

  const ua = userAgent.toLowerCase();

  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os x') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  if (ua.includes('ubuntu')) return 'Ubuntu';
  if (ua.includes('fedora')) return 'Fedora';

  return 'Unknown';
};
