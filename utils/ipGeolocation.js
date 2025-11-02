/**
 * Get location information from IP address using ip-api.com
 * Free tier: 45 requests/minute, no API key needed
 * 
 * @param {string} ip - IP address
 * @returns {Promise<{country: string, city: string, region?: string, state?: string, postalCode?: string, lat?: number, lon?: number, isp?: string}>}
 */
export async function getLocationFromIP(ip) {
  // Default response structure
  const defaultResponse = {
    country: 'Unknown',
    city: 'Unknown',
    region: null,
    state: null,
    postalCode: null,
    lat: null,
    lon: null,
    isp: 'Unknown',
  };

  // Skip localhost/internal IPs (these can't be geolocated)
  if (!ip || ip === 'Unknown' || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    console.log(`Skipping geolocation for local/internal IP: ${ip}`);
    return defaultResponse;
  }

  try {
    // Use ip-api.com free service (no API key needed)
    // Rate limit: 45 requests/minute from same IP
    // Requesting more fields: regionName (state/region), zip (postal code)
    // Note: Use HTTP for free tier (HTTPS requires paid plan)
    const apiUrl = `http://ip-api.com/json/${ip}?fields=status,message,country,city,lat,lon,isp,regionName,zip`;
    console.log(`Fetching geolocation for IP: ${ip} from ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (!response.ok) {
      console.error(`Geolocation API response not OK: ${response.status}`);
      throw new Error('Geolocation service unavailable');
    }

    const data = await response.json();
    console.log(`Geolocation API response for ${ip}:`, data);

    // Check if request was successful
    if (data.status === 'success') {
      return {
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.regionName || null,
        state: data.regionName || null, // regionName is state/province
        postalCode: data.zip || null,
        lat: data.lat || null,
        lon: data.lon || null,
        isp: data.isp || 'Unknown',
      };
    } else {
      // Service returned error
      console.error(`Geolocation API error for ${ip}:`, data.message || 'Unknown error');
      return defaultResponse;
    }
  } catch (error) {
    console.error(`IP Geolocation error for ${ip}:`, error.message || error);
    // Return defaults on error
    return defaultResponse;
  }
}

/**
 * Extract real IP address from request
 * Handles proxy/load balancer forwarded headers
 * 
 * @param {Request} req - Express request object
 * @returns {string} - IP address
 */
export function getClientIP(req) {
  // Check for forwarded headers (from proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = forwarded.split(',');
    return ips[0].trim();
  }

  // Check for real IP header (used by some proxies)
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }

  // Fallback to connection remote address
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown';
}

