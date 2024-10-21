import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectToDatabase } from '@/lib/database/mongodb';
import { updateUserCredits, updateUserPlanFields } from '@/lib/actions/user.actions';
import { createTransaction } from '@/lib/actions/transaction.action';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const reqText = await req.text();
  return webhooksHandler(reqText, req);
}


async function handleSubscriptionEvent(
  event: Stripe.Event,
  type: "created" | "deleted"
) {
  const subscription = event.data.object as Stripe.Subscription;

  const { db } = await connectToDatabase();
  let user;

  if (type === "created") {
    user = await db.collection('user').findOne({ clerk_id: subscription.metadata.userId });
  } else {
    // For deletion, find the user by subscriptionId
    user = await db.collection('user').findOne({ subscriptionId: subscription.id });
  }

  if (!user) {
    return NextResponse.json({
      status: 404,
      error: "User not found",
    });
  }

  let planData;
  if (type === "created") {
    planData = {
      planType: subscription.metadata?.planType,
      billingCycle: subscription.metadata?.billingCycle,
      isSubscribed: true,
      planCredits: parseInt(subscription.metadata?.planCredits) || 0,
      nextRenewalDate: new Date(subscription.current_period_end * 1000),
      subscriptionId: subscription.id,
    };
  } else {
    // For deletion, reset all subscription-related fields
    console.log("Deleting subscription for user:", user.clerk_id);
    planData = {
      planType: null,
      billingCycle: null,
      isSubscribed: false,
      planCredits: 0,
      nextRenewalDate: null,
      subscriptionId: null,
    };
  }

  try {
    const updatedUser = await updateUserPlanFields(user.clerk_id, planData);

    return NextResponse.json({
      status: 200,
      message: `Subscription ${type} success`,
      data: updatedUser,
    });
  } catch (error) {
    console.error(`Error during subscription ${type}:`, error);
    return NextResponse.json({
      status: 500,
      error: `Error during subscription ${type}`,
    });
  }
}

async function handleInvoiceEvent(
  event: Stripe.Event,
  status: "succeeded" | "failed"
) {
  const invoice = event.data.object as Stripe.Invoice;

  const { db } = await connectToDatabase();
  const user = await db.collection('user').findOne({ clerk_id: invoice.customer as string });

  if (!user) {
    return NextResponse.json({
      status: 404,
      error: "User not found",
    });
  }

  try {
    if (status === "succeeded") {
      // Check if this is a subscription renewal, not the initial subscription
      if (invoice.billing_reason === 'subscription_cycle') {
        const planCredits = parseInt(invoice.lines.data[0]?.metadata.planCredits) || 0;
        await updateUserCredits(user.clerk_id, planCredits);

        const transactionData = {
          stripeId: invoice.id,
          amount: invoice.amount_paid / 100,
          planType: user.planType || '',
          billingCycle: user.billingCycle || '',
          credits: planCredits,
          userId: user.clerk_id,
          type: 'subscription_renewal',
          createdAt: new Date(),
        };

        await createTransaction(transactionData);

        console.log(`Added ${planCredits} credits for user ${user.clerk_id} on subscription renewal`);
      } else {
        console.log(`Skipping credit addition for initial subscription payment for user ${user.clerk_id}`);
      }
    }

    return NextResponse.json({
      status: 200,
      message: `Invoice payment ${status}`,
    });
  } catch (error) {
    console.error(`Error handling invoice (payment ${status}):`, error);
    return NextResponse.json({
      status: 500,
      error: `Error handling invoice (payment ${status})`,
    });
  }
}

async function handleSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session, metadata: any, user: any) {
  const planCredits = parseInt(metadata.planCredits) || 0;
  const planData = {
    planType: metadata.planType || null,
    billingCycle: metadata.billingCycle || null,
    isSubscribed: true,
    planCredits: planCredits,
    nextRenewalDate: new Date(session.expires_at! * 1000),
    subscriptionId: session.subscription as string,
  };

  await updateUserPlanFields(user.clerk_id, planData);
  await updateUserCredits(user.clerk_id, planCredits);

  const transactionData = {
    stripeId: session.id,
    amount: session.amount_total! / 100,
    planType: planData.planType,
    billingCycle: planData.billingCycle,
    credits: planCredits,
    userId: user.clerk_id,
    type: 'subscription_created',
    createdAt: new Date(),
  };

  await createTransaction(transactionData);
}

async function handleOneTimePurchaseCheckoutCompleted(session: Stripe.Checkout.Session, metadata: any, user: any) {
  const creditsPurchased = parseInt(metadata.credits);
  await updateUserCredits(user.clerk_id, creditsPurchased);

  const transactionData = {
    stripeId: session.id,
    amount: session.amount_total! / 100,
    planType: 'one-time',
    billingCycle: '',
    credits: creditsPurchased,
    userId: user.clerk_id,
    type: 'pay-as-you-go',
    createdAt: new Date(),
  };

  await createTransaction(transactionData);
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata: any = session?.metadata;

  const { db } = await connectToDatabase();
  const user = await db.collection('user').findOne({ clerk_id: metadata?.userId });

  if (!user) {
    throw new Error("User not found");
  }

  try {
    if (session.mode === 'subscription') {
      await handleSubscriptionCheckoutCompleted(session, metadata, user);
    } else {
      await handleOneTimePurchaseCheckoutCompleted(session, metadata, user);
    }

    return NextResponse.json({
      status: 200,
      message: "Checkout session completed successfully",
    });
  } catch (error) {
    console.error("Error handling checkout session:", error);
    throw error;
  }
}

async function webhooksHandler(
  reqText: string,
  request: NextRequest
): Promise<NextResponse> {
  const sig = request.headers.get("Stripe-Signature");

  try {
    const event = await stripe.webhooks.constructEventAsync(
      reqText,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log(`Processing Stripe event: ${event.type}`);

    let result;
    switch (event.type) {
      case "customer.subscription.created":
        result = await handleSubscriptionEvent(event, "created");
        break;
      case "customer.subscription.deleted":
        result = await handleSubscriptionEvent(event, "deleted");
        break;
      case "invoice.payment_succeeded":
        result = await handleInvoiceEvent(event, "succeeded");
        break;
      case "invoice.payment_failed":
        result = await handleInvoiceEvent(event, "failed");
        break;
      case "checkout.session.completed":
        result = await handleCheckoutSessionCompleted(event);
        break;
      default:
        console.warn(`Unhandled event type: ${event.type}`);
        return NextResponse.json({
          status: 400,
          error: "Unhandled event type",
        });
    }

    console.log(`Successfully processed ${event.type}`);
    return result;
  } catch (err) {
    console.error("Error processing Stripe event:", err);
    return NextResponse.json({
      status: 500,
      error: "Webhook Error: " + (err instanceof Error ? err.message : "Unknown error"),
    });
  }
}