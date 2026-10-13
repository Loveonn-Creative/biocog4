// Finds and activates a user's captured-but-unactivated orders. Shared by
// reconcile-razorpay-payments and create-razorpay-order.
import { activateOrder } from './razorpayActivation.ts';
import { afterActivation, mask, razorpayApi, recentPendingOrders, supabaseStore } from './razorpayServer.ts';

export interface ReconcileOutcome {
  checked: number;
  activated: { tier: string; expiresAt: string | null }[];
}

// deno-lint-ignore no-explicit-any
export async function reconcileUser(admin: any, userId: string, env: { supabaseUrl: string; serviceKey: string; keyId: string; keySecret: string }): Promise<ReconcileOutcome> {
  const orders = await recentPendingOrders(admin, userId);
  const deps = { store: supabaseStore(admin), razorpay: razorpayApi(env.keyId, env.keySecret) };
  const activated: ReconcileOutcome['activated'] = [];
  for (const orderId of orders) {
    const r = await activateOrder(deps, { orderId, expectedUserId: userId });
    if (r.ok && r.activated) {
      console.log('Reconciled payment:', { order: mask(orderId), user: mask(userId) });
      await afterActivation(admin, env, { userId, tier: r.tier, cycle: r.cycle, subscriptionId: r.subscriptionId, paymentId: r.payment.id, orderId });
      activated.push({ tier: r.tier, expiresAt: r.expiresAt });
    }
  }
  return { checked: orders.length, activated };
}
