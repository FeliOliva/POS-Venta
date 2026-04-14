const salesService = require('./service');

function parseId(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    const err = new Error(`${label} inválido`);
    err.statusCode = 400;
    throw err;
  }
  return n;
}

async function create(req, res, next) {
  try {
    const { userId, cashBoxId } = req.body;
    const sale = await salesService.createSale(
      userId != null ? Number(userId) : null,
      cashBoxId != null ? Number(cashBoxId) : null,
    );
    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const saleId = parseId(req.params.saleId, 'saleId');
    const { productId, quantity } = req.body;
    const sale = await salesService.addItemToSale(
      saleId,
      productId != null ? Number(productId) : null,
      quantity != null ? Number(quantity) : null,
    );
    res.json(sale);
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const saleId = parseId(req.params.saleId, 'saleId');
    const itemId = parseId(req.params.itemId, 'itemId');
    const sale = await salesService.removeItemFromSale(saleId, itemId);
    res.json(sale);
  } catch (err) {
    next(err);
  }
}

async function recalculateTotal(req, res, next) {
  try {
    const saleId = parseId(req.params.saleId, 'saleId');
    const sale = await salesService.calculateTotal(saleId);
    res.json(sale);
  } catch (err) {
    next(err);
  }
}

async function addPayment(req, res, next) {
  try {
    const saleId = parseId(req.params.saleId, 'saleId');
    const { method, amount } = req.body;
    const sale = await salesService.registerPayment(
      saleId,
      method,
      amount != null ? Number(amount) : null,
    );
    res.json(sale);
  } catch (err) {
    next(err);
  }
}

async function complete(req, res, next) {
  try {
    const saleId = parseId(req.params.saleId, 'saleId');
    const sale = await salesService.completeSale(saleId);
    res.json(sale);
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const saleId = parseId(req.params.saleId, 'saleId');
    const sale = await salesService.cancelSale(saleId);
    res.json(sale);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  addItem,
  removeItem,
  recalculateTotal,
  addPayment,
  complete,
  cancel,
};
