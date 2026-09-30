const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const validRoles = [
  'SUPER_ADMIN',        // National Authority / Central Command (MoRTH / NHAI HQ)
  'STATE_ADMIN',        // State Revenue Dept / State Nodal Authority
  'DISTRICT_OFFICER',   // District SLAO (Special Land Acquisition Officer)
  'PROJECT_OFFICER',    // Field Verification Officer / Revenue Amin / Kanungo
  'LANDOWNER',          // Citizen (Citizen Portal Access)
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    mobile: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: validRoles,
        message: 'Invalid role specified. Allowed: {VALUES}',
      },
      default: 'PROJECT_OFFICER',
    },
    designation: {
      type: String,
      trim: true,
      default: 'Land Acquisition Officer',
    },
    department: {
      type: String,
      trim: true,
      default: 'Revenue & Land Acquisition Department',
    },
    // Jurisdiction Scopes for Data Isolation (PRD Section 10-14)
    state: {
      type: String,
      trim: true, // e.g. 'Haryana', 'Rajasthan', 'All'
      default: 'All',
    },
    district: {
      type: String,
      trim: true, // e.g. 'Sonipat', 'Gurugram', 'All'
      default: 'All',
    },
    tehsil: {
      type: String,
      trim: true, // e.g. 'Rai', 'Ganaur', 'All'
      default: 'All',
    },
    village: {
      type: String,
      trim: true, // e.g. 'Murshadpur', 'Bhondsi', 'All'
      default: 'All',
    },
    permissions: [
      {
        type: String, // e.g. 'CREATE_PROJECT', 'ADVANCE_STAGE', 'FLAG_ISSUE', 'VIEW_ALL_JURISDICTIONS'
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user has specific permission or is Super Admin
userSchema.methods.hasPermission = function (permission) {
  if (this.role === 'SUPER_ADMIN') return true;
  return this.permissions && this.permissions.includes(permission);
};

// Safe JSON serialization
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
