import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { verifyGoogleToken } from '../utils/verifyGoogleToken.js';

/**
 * @route   POST /api/auth/google
 * @desc    Register or login user with Google social login (verifies ID token)
 * @access  Public
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // Validate ID token is provided
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    // Verify the Google ID token
    let verifiedUser;
    try {
      verifiedUser = await verifyGoogleToken(idToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token: ' + error.message,
      });
    }

    // Extract verified user data (we trust this data as it comes from Google)
    const { email, name, picture, googleId } = verifiedUser;

    // Find user by email or googleId
    let user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { googleId: googleId },
      ],
    });

    if (user) {
      // User exists - update Google info if needed
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (user.provider !== 'google') {
        user.provider = 'google';
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
      // Update name if changed
      if (name && user.name !== name) {
        user.name = name;
      }
      await user.save();
    } else {
      // Create new user with verified Google data
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId: googleId,
        avatar: picture || undefined,
        provider: 'google',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/auth/admin
 * @desc    Admin/Owner login (only for you)
 * @access  Public
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user has password (not just social login)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses social login',
      });
    }

    // Verify password
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};
