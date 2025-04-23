// controllers/notificationController.js
const PaymentNotification = require("../models/PaymentNotificationModel");
const mongoose = require("mongoose");

// Get all notifications for a user with payment filter
const getNotifications = async (req, res) => {
  try {
    const { paymentStatus } = req.query;
    const filter = { recipients: req.user._id.toString() };

    if (paymentStatus) {
      filter["message"] = { $regex: paymentStatus, $options: "i" };
    }

    const notifications = await PaymentNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch notifications" });
  }
};

// Get all notifications for admin
const getAllNotificationForAdmin = async (req, res) => {
  try {
    const { paymentStatus } = req.query;
    const filter = { recipients: "admin" };

    if (paymentStatus) {
      filter["message"] = { $regex: paymentStatus, $options: "i" };
    }

    const notifications = await PaymentNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch notifications" });
  }
};

// Mark notification as read (user)
const markNotificationAsRead = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification ID" });
    }

    const notification = await PaymentNotification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipients: req.user._id.toString(),
      },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update notification" });
  }
};

// Mark notification as read (admin)
const markNotificationAsReadForAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification ID" });
    }

    const notification = await PaymentNotification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipients: "admin",
      },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error marking admin notification as read:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update notification" });
  }
};

// Mark all as read (user)
const markAllNotificationsAsRead = async (req, res) => {
  try {
    await PaymentNotification.updateMany(
      {
        recipients: req.user._id.toString(),
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update notifications" });
  }
};

// Mark all as read (admin)
const markAllNotificationsAsReadForAdmin = async (req, res) => {
  try {
    await PaymentNotification.updateMany(
      {
        recipients: "admin",
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all admin notifications as read:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update notifications" });
  }
};

// Delete notification (user)
const deleteNotification = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification ID" });
    }

    const notification = await PaymentNotification.findOneAndDelete({
      _id: req.params.id,
      recipients: req.user._id.toString(),
    });

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete notification" });
  }
};

// Delete notification (admin)
const deleteNotificationForAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification ID" });
    }

    const notification = await PaymentNotification.findOneAndDelete({
      _id: req.params.id,
      recipients: "admin",
    });

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin notification:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete notification" });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
  getAllNotificationForAdmin,
  markNotificationAsReadForAdmin,
  markAllNotificationsAsReadForAdmin,
  deleteNotificationForAdmin,
};
