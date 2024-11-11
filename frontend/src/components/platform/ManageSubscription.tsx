'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/nextjs";
import Button from "@/components/landing/components/Button";
import { getUserById } from '@/lib/actions/user.actions';
import { pricing } from "@/components/landing/constants";
import { check } from "@/components/landing/assets";
import { loadStripe, Stripe } from '@stripe/stripe-js';


const ManageSubscription: React.FC = () => {
  const { user } = useUser();
  const [userPlanType, setUserPlanType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    setStripePromise(loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!));
  }, []);

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (user?.id) {
        const userData = await getUserById(user.id);
        setUserPlanType(userData?.planType || null);
        setIsLoading(false);
      }
    };
    fetchUserPlan();
  }, [user]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleSubscription = async (planType: string, billingCycle: string, planCredits: number, priceID: string, link: string) => {
    if (link === "mailto:sales@lunaris.media") {
      window.location.href = link;
      return;
    }

    if (userPlanType === planType) {
      window.location.href = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL || '#';
      return;
    }

    try {
      const response = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          billingCycle,
          planCredits,
          priceID,
          userId: user?.id,
          subscription: true
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create checkout session');
      }

      const { sessionId } = responseData;
      
      if (sessionId) {
        const stripe = await stripePromise;
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            console.error('Stripe redirect error:', error);
          }
        } else {
          console.error('Stripe has not been initialized');
        }
      } else {
        console.error('No session ID returned from the server');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Your Subscription</h1>
      <div className="p-4 bg-n-8 rounded-2xl">
        <div className="flex justify-center items-center mb-6">
          <span className={`mr-4 ${isAnnual ? 'text-n-4' : 'text-n-1'}`}>Monthly</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAnnual}
              onChange={() => setIsAnnual(!isAnnual)}
            />
            <div className="w-14 h-7 bg-n-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-n-1 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-light"></div>
          </label>
          <span className={`ml-4 ${isAnnual ? 'text-n-1' : 'text-n-4'}`}>Annual</span>
        </div>
        <p className="text-center text-green-500 font-semibold mb-8">Save 20% with annual billing</p>

        <div className="flex justify-center gap-[1rem] max-lg:flex-wrap">
          {pricing.map((item) => {
            const currentPlan = item.price_plans?.find(plan => plan.billingCycle === (isAnnual ? 'annual' : 'monthly'));
            
            return (
              <div
                key={item.id}
                className="w-[19rem] max-lg:w-full h-full px-6 bg-n-8 border border-n-6 rounded-[2rem] lg:w-auto py-14 [&>h4]:first:text-color-2 [&>h4]:even:text-color-1 [&>h4]:last:text-color-3"
              >
                <h4 className="h4 mb-4">{item.title}</h4>

                <p className="body-2 min-h-[4rem] mb-3 text-n-1/50">
                  {item.description}
                </p>

                <div className="flex items-center h-[5.5rem] mb-6">
                  {currentPlan && currentPlan.price && (
                    <>
                      <div className="h3">$</div>
                      <div className="text-[5.5rem] leading-none font-bold">
                        {currentPlan.price.split('/')[0]}
                      </div>
                      <div className="text-n-1/50 ml-2">
                        {isAnnual ? "/year" : "/month"}
                      </div>
                      {isAnnual && currentPlan.og_price && (
                        <div className="ml-4 flex flex-col items-start">
                          <span className="text-n-1/50 line-through text-2xl">
                            ${currentPlan.og_price.split('/')[0]}
                          </span>
                          <span className="text-green-500 text-sm">
                            Save ${parseInt(currentPlan.og_price) - parseInt(currentPlan.price)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Button
                  className="w-full mb-6"
                  onClick={() => handleSubscription(
                    currentPlan?.planType || '',
                    currentPlan?.billingCycle || '',
                    parseInt(currentPlan?.credits || '0'),
                    currentPlan?.priceID || '',
                    currentPlan?.link || ''
                  )}
                  px={4}
                  white={true}
                >
                  {userPlanType === currentPlan?.planType ? 'Manage Subscription' : item.buttonText}
                </Button>

                <ul>
                  {currentPlan?.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start py-3 border-t border-n-6"
                    >
                     <img src={check} width={20} height={20} alt="Check" className="mt-0.5 mr-4" />
                     <p className="text-base font-normal">{feature}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ManageSubscription;
