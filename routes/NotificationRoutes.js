// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/AdminMiddleware");
const {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
  getAllNotificationForAdmin,
  markNotificationAsReadForAdmin,
  markAllNotificationsAsReadForAdmin,
  deleteNotificationForAdmin,
} = require("../controllers/NotificationController");

// User routes
router.get("/notifications/user", auth, getNotifications);
router.put("/notifications/user/:id/read", auth, markNotificationAsRead);
router.delete("/notifications/user/:id", auth, deleteNotification);
router.put(
  "/notifications/user/mark-all-read",
  auth,
  markAllNotificationsAsRead
);

// Admin routes
router.get("/notifications/admin", getAllNotificationForAdmin);
router.put(
  "/notifications/admin/:id/read",

  markNotificationAsReadForAdmin
);
router.put(
  "/notifications/admin/mark-all-read",

  markAllNotificationsAsReadForAdmin
);
router.delete(
  "/notifications/admin/:id",

  deleteNotificationForAdmin
);

module.exports = router;
