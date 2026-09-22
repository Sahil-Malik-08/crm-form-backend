const express = require('express');
const router = express.Router();
const controller = require('../controllers/formTemplateController');

router.get('/', controller.list);
router.post('/', controller.create);
router.delete('/:id', controller.remove);

module.exports = router;