const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const memberController = require('../controllers/memberController');

router.get('/', auth(['admin', 'trainer']), memberController.getAllMembers);
router.post('/', auth(['admin', 'trainer']), memberController.createMember);
router.get('/:id', auth(['admin', 'trainer']), memberController.getMemberById);
router.put('/:id', auth(['admin', 'trainer']), memberController.updateMember);
router.delete('/:id', auth(['admin', 'trainer']), memberController.deleteMember);

module.exports = router;
