const {
  SaleStatus,
  CashStatus,
  SaleEventType,
  PaymentMethod,
} = require('@prisma/client');
const { prisma } = require('../../lib/prisma');

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function assertPositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw httpError(`${label} inválido`, 400);
  }
  return n;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function assertEditable(sale) {
  if (
    sale.status === SaleStatus.COMPLETED ||
    sale.status === SaleStatus.CANCELLED
  ) {
    throw httpError('La venta no admite modificaciones', 409);
  }
}

async function recalculateSaleTotal(tx, saleId) {
  const agg = await tx.saleItem.aggregate({
    where: { saleId },
    _sum: { subtotal: true },
  });
  const sum = roundMoney(agg._sum.subtotal ?? 0);
  await tx.sale.update({
    where: { id: saleId },
    data: { total: sum, totalCalculated: sum },
  });
  return sum;
}

async function getSaleForUpdate(tx, saleId) {
  const sale = await tx.sale.findUnique({ where: { id: saleId } });
  if (!sale) {
    throw httpError('Venta no encontrada', 404);
  }
  return sale;
}

async function createSaleEvent(tx, saleId, type, payload) {
  await tx.saleEvent.create({
    data: {
      saleId,
      type,
      payload,
    },
  });
}

/**
 * @param {number} userId
 * @param {number} cashBoxId
 */
async function createSale(userId, cashBoxId) {
  if (userId == null || cashBoxId == null) {
    throw httpError('userId y cashBoxId son obligatorios', 400);
  }

  const uid = Number(userId);
  const cbid = Number(cashBoxId);
  if (!Number.isInteger(uid) || uid < 1 || !Number.isInteger(cbid) || cbid < 1) {
    throw httpError('userId y cashBoxId deben ser enteros positivos', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) {
    throw httpError('Usuario no encontrado', 404);
  }

  const cashBox = await prisma.cashBox.findUnique({
    where: { id: cbid },
  });
  if (!cashBox) {
    throw httpError('Caja no encontrada', 404);
  }
  if (cashBox.status !== CashStatus.OPEN) {
    throw httpError('La caja debe estar abierta para crear una venta', 400);
  }
  if (cashBox.userId !== uid) {
    throw httpError('La caja no pertenece al usuario indicado', 403);
  }

  return prisma.sale.create({
    data: {
      userId: uid,
      cashBoxId: cbid,
      status: SaleStatus.PENDING,
      total: 0,
      totalCalculated: 0,
    },
    include: {
      items: true,
      payments: true,
      events: true,
    },
  });
}

/**
 * @param {number} saleId
 * @param {number} productId
 * @param {number} quantity
 */
async function addItemToSale(saleId, productId, quantity) {
  const sid = assertPositiveInt(saleId, 'saleId');
  const pid = Number(productId);
  if (!Number.isInteger(pid) || pid < 1) {
    throw httpError('productId inválido', 400);
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw httpError('La cantidad debe ser mayor que cero', 400);
  }

  return prisma.$transaction(async (tx) => {
    const sale = await getSaleForUpdate(tx, sid);
    assertEditable(sale);

    const product = await tx.product.findUnique({ where: { id: pid } });
    if (!product) {
      throw httpError('Producto no encontrado', 404);
    }
    if (!product.isActive) {
      throw httpError('El producto no está activo', 400);
    }

    const unitPrice = roundMoney(product.price);
    const addQty = qty;

    const existing = await tx.saleItem.findFirst({
      where: { saleId: sid, productId: pid },
    });

    if (existing) {
      const newQty = existing.quantity + addQty;
      const subtotal = roundMoney(newQty * unitPrice);
      const updated = await tx.saleItem.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          unitPrice,
          subtotal,
        },
      });
      await createSaleEvent(tx, sid, SaleEventType.ITEM_UPDATED, {
        itemId: updated.id,
        productId: pid,
        quantity: newQty,
        unitPrice,
        subtotal,
      });
    } else {
      const subtotal = roundMoney(addQty * unitPrice);
      const created = await tx.saleItem.create({
        data: {
          saleId: sid,
          productId: pid,
          quantity: addQty,
          unitPrice,
          subtotal,
        },
      });
      await createSaleEvent(tx, sid, SaleEventType.ITEM_ADDED, {
        itemId: created.id,
        productId: pid,
        quantity: addQty,
        unitPrice,
        subtotal,
      });
    }

    await recalculateSaleTotal(tx, sid);

    return tx.sale.findUnique({
      where: { id: sid },
      include: {
        items: { include: { product: true } },
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  });
}

/**
 * @param {number} saleId
 * @param {number} itemId
 */
async function removeItemFromSale(saleId, itemId) {
  const sid = assertPositiveInt(saleId, 'saleId');
  const iid = assertPositiveInt(itemId, 'itemId');

  return prisma.$transaction(async (tx) => {
    const sale = await getSaleForUpdate(tx, sid);
    assertEditable(sale);

    const item = await tx.saleItem.findFirst({
      where: { id: iid, saleId: sid },
      include: { product: true },
    });
    if (!item) {
      throw httpError('Ítem no encontrado en la venta', 404);
    }

    await tx.saleItem.delete({ where: { id: iid } });
    await createSaleEvent(tx, sid, SaleEventType.ITEM_REMOVED, {
      itemId: iid,
      productId: item.productId,
    });

    await recalculateSaleTotal(tx, sid);

    return tx.sale.findUnique({
      where: { id: sid },
      include: {
        items: { include: { product: true } },
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  });
}

/**
 * @param {number} saleId
 */
async function calculateTotal(saleId) {
  const sid = assertPositiveInt(saleId, 'saleId');

  return prisma.$transaction(async (tx) => {
    const sale = await getSaleForUpdate(tx, sid);
    assertEditable(sale);
    await recalculateSaleTotal(tx, sid);
    return tx.sale.findUnique({
      where: { id: sid },
      include: {
        items: { include: { product: true } },
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  });
}

/**
 * @param {number} saleId
 * @param {import('@prisma/client').PaymentMethod} method
 * @param {number} amount
 */
async function registerPayment(saleId, method, amount) {
  const sid = assertPositiveInt(saleId, 'saleId');
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw httpError('El monto del pago debe ser mayor que cero', 400);
  }
  if (method == null || method === '') {
    throw httpError('El método de pago es obligatorio', 400);
  }

  const allowedMethods = Object.values(PaymentMethod);
  if (!allowedMethods.includes(method)) {
    throw httpError('Método de pago inválido', 400);
  }

  return prisma.$transaction(async (tx) => {
    const sale = await getSaleForUpdate(tx, sid);
    assertEditable(sale);

    const payment = await tx.payment.create({
      data: {
        saleId: sid,
        method,
        amount: roundMoney(amt),
      },
    });

    await createSaleEvent(tx, sid, SaleEventType.PAYMENT_ADDED, {
      paymentId: payment.id,
      method,
      amount: payment.amount,
    });

    return tx.sale.findUnique({
      where: { id: sid },
      include: {
        items: { include: { product: true } },
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  });
}

/**
 * @param {number} saleId
 */
async function completeSale(saleId) {
  const sid = assertPositiveInt(saleId, 'saleId');

  return prisma.$transaction(async (tx) => {
    const sale = await getSaleForUpdate(tx, sid);
    assertEditable(sale);

    await recalculateSaleTotal(tx, sid);
    const saleAfterTotal = await tx.sale.findUnique({ where: { id: sid } });

    const payments = await tx.payment.findMany({ where: { saleId: sid } });
    const paid = roundMoney(
      payments.reduce((sum, p) => sum + p.amount, 0),
    );
    const total = roundMoney(saleAfterTotal.total);

    if (paid < total) {
      throw httpError('El monto pagado es insuficiente para completar la venta', 400);
    }

    await tx.sale.update({
      where: { id: sid },
      data: { status: SaleStatus.COMPLETED },
    });

    return tx.sale.findUnique({
      where: { id: sid },
      include: {
        items: { include: { product: true } },
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  });
}

/**
 * @param {number} saleId
 */
async function cancelSale(saleId) {
  const sid = assertPositiveInt(saleId, 'saleId');

  return prisma.$transaction(async (tx) => {
    const sale = await getSaleForUpdate(tx, sid);
    assertEditable(sale);

    await tx.sale.update({
      where: { id: sid },
      data: { status: SaleStatus.CANCELLED },
    });

    await createSaleEvent(tx, sid, SaleEventType.SALE_CANCELLED, {
      saleId: sid,
    });

    return tx.sale.findUnique({
      where: { id: sid },
      include: {
        items: { include: { product: true } },
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  });
}

module.exports = {
  createSale,
  addItemToSale,
  removeItemFromSale,
  calculateTotal,
  registerPayment,
  completeSale,
  cancelSale,
};
