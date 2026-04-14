const { Router } = require('express');
const salesController = require('./controller');

const router = Router();

router.post('/', salesController.create);
router.post('/:saleId/items', salesController.addItem);
router.delete('/:saleId/items/:itemId', salesController.removeItem);
router.post('/:saleId/recalculate-total', salesController.recalculateTotal);
router.post('/:saleId/payments', salesController.addPayment);
router.post('/:saleId/complete', salesController.complete);
router.post('/:saleId/cancel', salesController.cancel);

module.exports = router;
