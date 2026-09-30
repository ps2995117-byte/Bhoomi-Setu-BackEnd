const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to sign JWT and attach HTTP-only cookie with full jurisdiction metadata
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    token, // Return token so frontend stores in localStorage & uses Bearer Authorization header
    message: message || 'Authentication successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      designation: user.designation,
      department: user.department,
      state: user.state,
      district: user.district,
      tehsil: user.tehsil,
      village: user.village,
      permissions: user.permissions || [],
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
};

// @desc    Register a new officer
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, mobile, designation, department, state, district, tehsil, village } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, official email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An officer account with this email address already exists',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'PROJECT_OFFICER',
      mobile: mobile || undefined,
      designation: designation || 'Land Acquisition Officer',
      department: department || 'Revenue Department',
      state: state || 'All',
      district: district || 'All',
      tehsil: tehsil || 'All',
      village: village || 'All',
      permissions: role === 'SUPER_ADMIN' ? ['CREATE_PROJECT', 'ADVANCE_STAGE', 'FLAG_ISSUE', 'VIEW_ALL_JURISDICTIONS'] : ['ADVANCE_STAGE', 'FLAG_ISSUE'],
    });

    sendTokenResponse(user, 201, res, 'Officer registered successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate officer with email & password (PRD Section 24)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid official credentials',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid official credentials',
      });
    }

    sendTokenResponse(user, 200, res, `Welcome back, ${user.name}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Request OTP for Landowner Citizen Login (PRD Section 25)
// @route   POST /api/auth/otp/request
// @access  Public
const requestOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide mobile number',
      });
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number',
      });
    }

    // In demo mode, standard OTP is 123456
    const demoOtp = '123456';

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanMobile}`,
      demoOtp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP for Landowner Citizen Login (PRD Section 25)
// @route   POST /api/auth/otp/verify
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both mobile number and OTP',
      });
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

    if (otp !== '123456' && otp !== '999999') {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP entered. (For SIH Demo, use OTP: 123456)',
      });
    }

    const Parcel = require('../models/Parcel');
    const mappedParcels = await Parcel.find({ ownerMobile: cleanMobile }).populate('projectId');

    let ownerName = mappedParcels[0]?.ownerName || `Landowner (${cleanMobile})`;
    let user = await User.findOne({ mobile: cleanMobile });

    if (!user) {
      user = await User.create({
        name: ownerName,
        mobile: cleanMobile,
        email: `citizen_${cleanMobile}@bhoomi.gov.in`,
        role: 'LANDOWNER',
        designation: 'Affected Landowner',
        department: 'Citizen Beneficiary',
      });
    }

    if (mappedParcels.length > 0) {
      await Parcel.updateMany(
        { ownerMobile: cleanMobile, ownerId: null },
        { ownerId: user._id }
      );
    }

    sendTokenResponse(user, 200, res, 'Citizen authenticated successfully via OTP');
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently authenticated user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User session not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        designation: user.designation,
        department: user.department,
        state: user.state,
        district: user.district,
        tehsil: user.tehsil,
        village: user.village,
        permissions: user.permissions || [],
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log out user / clear cookie
// @route   POST /api/auth/logout
// @access  Public / Private
const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

module.exports = {
  register,
  login,
  requestOtp,
  verifyOtp,
  getMe,
  logout,
};
