const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/dbFeaturesController');

// ── Views ─────────────────────────────────────────────────────
router.get('/views/member-dashboard', auth(['admin']), ctrl.getMemberDashboard);
router.get('/views/monthly-revenue', auth(['admin']), ctrl.getMonthlyRevenue);
router.get('/views/daily-attendance', auth(['admin']), ctrl.getDailyAttendance);
router.get('/views/equipment-health', auth(['admin']), ctrl.getEquipmentHealth);

// ── Stored Procedures ────────────────────────────────────────
router.post('/procedures/register-member', auth(['admin']), ctrl.callRegisterMember);
router.post('/procedures/renew-subscription', auth(['admin']), ctrl.callRenewSubscription);
router.get('/procedures/performance-report', auth(['admin']), ctrl.callPerformanceReport);

// ── Functions ────────────────────────────────────────────────
router.get('/functions/all', auth(['admin']), ctrl.getAllFunctionResults);
router.get('/functions/member-age/:id', auth(['admin']), ctrl.getMemberAge);
router.get('/functions/subscription-status/:id', auth(['admin']), ctrl.getSubscriptionStatus);
router.get('/functions/member-revenue/:id', auth(['admin']), ctrl.getMemberRevenue);

// ── Triggers / Audit Log ─────────────────────────────────────
router.get('/audit-log', auth(['admin']), ctrl.getAuditLog);
router.post('/trigger-test', auth(['admin']), ctrl.triggerTestPayment);

module.exports = router;
