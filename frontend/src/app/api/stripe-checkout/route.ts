import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { 
    planType, 
    billingCycle, 
    planCredits, 
    priceID, 
    userId, 
    subscription, 
    credits, 
    amount 
  } = await req.json();
  
  try {
    let session;

    if (subscription) {
      // Handle subscription checkout
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceID, quantity: 1 }],
        metadata: { planType, billingCycle, planCredits, userId },
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/home`,
        cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/cancel`,
        allow_promotion_codes: true,
      });
    } else {
      // Handle one-time credit purchase
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Purchase of ${credits} Credits`,
              description: '1 credit = 1 minute of processing',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        }],
        metadata: { userId, credits, type: 'credit_purchase' },
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/home`,
        cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/cancel`,
      });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
