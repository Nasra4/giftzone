const ApiError = require('../utils/ApiError');

/*
 * Payment provider adapters.
 *
 * GiftZone never receives, logs or stores card numbers, CVVs or wallet PINs. For card, EVC Plus and
 * e-Dahab the customer pays on the provider's hosted page (or approves a push prompt on their phone);
 * we only keep the provider's session/transaction reference.
 *
 * PAYMENT_MODE=sandbox  -> every non-COD method uses the built-in sandbox, which sends the customer
 *                          to /pay/sandbox/:orderNumber where they can simulate success or failure.
 * PAYMENT_MODE=live     -> real adapters are required. They are stubs here because they need merchant
 *                          credentials and the provider's API contract; see README "Going live".
 */

const sandboxAdapter = {
  async createSession({ order, method }) {
    return {
      reference: `SBX-${method.toUpperCase()}-${order.order_number}`,
      checkoutUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/pay/sandbox/${order.order_number}`,
    };
  },
};

const liveStub = (label) => ({
  async createSession() {
    throw new ApiError(503, `${label} payments are not configured yet. Choose another method or contact support.`);
  },
});

const liveAdapters = {
  card: liveStub('Card'),
  evc_plus: liveStub('EVC Plus'),
  edahab: liveStub('e-Dahab'),
};

async function createPaymentSession(order, method) {
  if (method === 'cod') return { reference: null, checkoutUrl: null };
  const adapter = process.env.PAYMENT_MODE === 'live' ? liveAdapters[method] : sandboxAdapter;
  return adapter.createSession({ order, method });
}

const isSandbox = () => process.env.PAYMENT_MODE !== 'live';

module.exports = { createPaymentSession, isSandbox };
