const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

router.get('/', itemController.getAll);
router.post('/', itemController.create);
router.put('/:id', itemController.update);
router.delete('/:id', itemController.remove);

module.exports = router;

