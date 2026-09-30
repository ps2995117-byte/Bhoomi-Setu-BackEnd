const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let query = {};
    if (userRole === 'LANDOWNER') {
      // Citizens only receive alerts related to their own account or parcel
      query = { userId };
    } else {
      // Government Officers receive administrative, corridor, and AI dispute alerts
      query = {
        $or: [
          { userId },
          { userRole: 'ALL' },
          { userRole: 'OFFICER' },
          { userRole: 'SUPER_ADMIN' },
          { userRole: userRole },
        ],
      };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all user notifications as read
// @route   POST /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    await Notification.updateMany(
      {
        $or: [
          { userId },
          { userRole: 'ALL' },
          { userRole: userRole },
        ],
        isRead: false,
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger simulated alert for testing
// @route   POST /api/notifications/simulate-alert
// @access  Private
const simulateAlert = async (req, res, next) => {
  try {
    const { title, message, type, actionLink } = req.body;

    const notif = await Notification.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ALL',
      type: type || 'SYSTEM',
      title: title || 'New Acquisition Workflow Alert',
      message: message || 'A new workflow action or dispute has been registered.',
      actionLink: actionLink || '/dashboard',
    });

    res.status(201).json({
      success: true,
      notification: notif,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  simulateAlert,
};
