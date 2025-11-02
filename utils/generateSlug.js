/**
 * Generate a random slug for URL shortening
 * @param {number} length - Length of the slug (default: 6)
 * @returns {string} - Random alphanumeric slug
 */
export const generateSlug = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
};

/**
 * Check if a slug is available
 * @param {string} slug - Slug to check
 * @param {Model} LinkModel - Mongoose Link model
 * @returns {Promise<boolean>} - True if available, false otherwise
 */
export const isSlugAvailable = async (slug, LinkModel) => {
  const existingLink = await LinkModel.findOne({ slug });
  return !existingLink;
};

/**
 * Generate a unique slug
 * @param {Model} LinkModel - Mongoose Link model
 * @param {number} length - Initial length of the slug (default: 6)
 * @returns {Promise<string>} - Unique slug
 */
export const generateUniqueSlug = async (LinkModel, length = 6) => {
  let slug = generateSlug(length);
  let attempts = 0;
  const maxAttempts = 10;

  while (!(await isSlugAvailable(slug, LinkModel))) {
    attempts++;
    if (attempts > maxAttempts) {
      // If we can't find a unique slug with current length, increase length
      length++;
      attempts = 0;
    }
    slug = generateSlug(length);
  }

  return slug;
};
