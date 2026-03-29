import Stripe from "stripe";

function unixToIso(timestamp) {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
}

export function createBillingService(database, appUrl) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
  const priceByPlan = {
    starter: process.env.STRIPE_PRICE_STARTER || "",
    growth: process.env.STRIPE_PRICE_GROWTH || "",
    scale: process.env.STRIPE_PRICE_SCALE || ""
  };

  async function createCheckoutSession({ client, userEmail, requestedPlan }) {
    const plan = requestedPlan || client.plan || "starter";
    const existingSubscription = database.getSubscriptionForClient(client.id);

    if (!stripe || !priceByPlan[plan]) {
      database.upsertSubscriptionForCheckout(client.id, {
        plan,
        status: "demo",
        checkoutUrl: `${appUrl}/?billing=demo&client=${client.id}`
      });
      database.updateBillingStatus(client.id, "demo");

      return {
        mode: "demo",
        url: null,
        message: "Stripe ei ole konfiguroitu. Lisaa STRIPE_SECRET_KEY ja STRIPE_PRICE_* arvot .env-tiedostoon."
      };
    }

    let stripeCustomerId = existingSubscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: client.businessName,
        metadata: {
          clientId: String(client.id),
          plan
        }
      });
      stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: String(client.id),
      success_url: `${appUrl}/?checkout=success&client=${client.id}`,
      cancel_url: `${appUrl}/?checkout=cancelled&client=${client.id}`,
      line_items: [
        {
          price: priceByPlan[plan],
          quantity: 1
        }
      ],
      metadata: {
        clientId: String(client.id),
        plan
      }
    });

    database.upsertSubscriptionForCheckout(client.id, {
      plan,
      status: "pending",
      stripeCheckoutSessionId: session.id,
      stripeCustomerId,
      checkoutUrl: session.url
    });
    database.updateBillingStatus(client.id, "pending");

    return {
      mode: "live",
      url: session.url,
      sessionId: session.id
    };
  }

  async function handleWebhookRequest(req) {
    if (!stripe || !webhookSecret) {
      return {
        received: false,
        message: "Stripe webhook is not configured."
      };
    }

    const signature = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscription = database.updateSubscriptionByCheckoutSession(session.id, {
        status: "active",
        stripeCustomerId: session.customer || null,
        stripeSubscriptionId: session.subscription || null
      });

      if (subscription) {
        database.updateBillingStatus(subscription.clientId, "active");
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const row = database.updateSubscriptionByStripeSubscription(subscription.id, {
        status: subscription.status,
        currentPeriodEnd: unixToIso(subscription.current_period_end)
      });

      if (row) {
        database.updateBillingStatus(row.clientId, subscription.status);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const row = database.updateSubscriptionByStripeSubscription(subscription.id, {
        status: "canceled",
        currentPeriodEnd: unixToIso(subscription.current_period_end)
      });

      if (row) {
        database.updateBillingStatus(row.clientId, "canceled");
      }
    }

    return {
      received: true,
      type: event.type
    };
  }

  return {
    configured: Boolean(stripe),
    createCheckoutSession,
    handleWebhookRequest
  };
}
