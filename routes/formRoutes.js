const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');

router.get('/', formController.list);
router.get('/approvals', formController.approvals);
router.put('/responses/:id/status', formController.setStatus);
router.post('/', formController.create);
router.put('/:id', formController.update);
router.delete('/:id', formController.remove);
router.post('/:id/responses', formController.submit);

module.exports = router;
