const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 1. Check HTTP-only cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Or check Authorization header (Bearer token)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, please sign in to the command portal',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user session is no longer active',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, session expired or invalid',
    });
  }
};

// Optional protect middleware (doesn't reject if not logged in, but attaches req.user if valid token present)
const optionalProtect = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (e) {
    // Ignore invalid token in optional protect
  }
  next();
};

// Restrict access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user?.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

// Restrict to specific permissions (PRD Section 13 & 35)
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Forbidden: User lacks '${permission}' permission`,
    });
  };
};

// Data Isolation & Jurisdiction Query Builder (PRD Section 10-14 & 34)
const getJurisdictionFilter = (user, entityType = 'project') => {
  if (!user || user.role === 'SUPER_ADMIN' || user.district === 'All' && user.state === 'All') {
    return {};
  }

  const filter = {};

  if (user.role === 'STATE_ADMIN') {
    if (user.state && user.state !== 'All') {
      filter.state = user.state;
    }
    return filter;
  }

  if (user.role === 'DISTRICT_OFFICER') {
    if (user.state && user.state !== 'All') filter.state = user.state;
    if (user.district && user.district !== 'All') {
      if (entityType === 'project') {
        filter.$or = [
          { district: user.district },
          { secondaryDistricts: user.district },
        ];
      } else {
        filter.district = user.district;
      }
    }
    return filter;
  }

  if (user.role === 'PROJECT_OFFICER') {
    if (user.state && user.state !== 'All') filter.state = user.state;
    if (user.district && user.district !== 'All') filter.district = user.district;
    if (entityType === 'parcel') {
      if (user.village && user.village !== 'All') {
        filter.$or = [
          { assignedOfficer: user._id },
          { village: user.village },
        ];
      } else {
        filter.$or = [
          { assignedOfficer: user._id },
          { district: user.district },
        ];
      }
    }
    return filter;
  }

  return filter;
};

module.exports = {
  protect,
  optionalProtect,
  authorize,
  requirePermission,
  getJurisdictionFilter,
};
