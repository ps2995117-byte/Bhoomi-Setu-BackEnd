const mongoose = require('mongoose');

const NOTIF_TYPES = [
  'STAGE_UPDATE',
  'DOCUMENT_STATUS',
  'COMPENSATION_OFFER',
  'PAYMENT_DISBURSED',
  'DISPUTE_RAISED',
  'AI_ALERT',
  'SYSTEM',
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userRole: {
      type: String,
      default: 'ALL',
    },
    parcelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parcel',
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    type: {
      type: String,
      enum: {
        values: NOTIF_TYPES,
        message: 'Invalid notification type. Allowed: {VALUES}',
      },
      default: 'SYSTEM',
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionLink: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
