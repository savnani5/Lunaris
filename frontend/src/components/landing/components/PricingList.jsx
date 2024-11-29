'use client'

import { check } from "../assets";
import { pricing } from "../constants";
import Button from "./Button";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { getUserById } from '@/lib/actions/user.actions';
import { useRouter } from 'next/navigation';

const PricingList = ({ isAnnual }) => {
  const { user } = useUser();
  const router = useRouter();
  const [userPlanType, setUserPlanType] = useState(null);

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (user?.id) {
        const userData = await getUserById(user.id);
        setUserPlanType(userData?.planType || null);
      }
    };
    fetchUserPlan();
  }, [user]);

  const handleSubscription = async (planType, link) => {
    if (!user) {
      router.push('/manage-subscription');
      return;
    }

    if (link === "mailto:sales@lunaris.media") {
      window.location.href = link;
      return;
    }

    if (userPlanType === planType) {
      window.location.href = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL || '#';
      return;
    }

    window.location.href = link;
  };

  return (
    <div className="flex justify-center gap-[1.5rem] max-lg:flex-wrap">
      {pricing.map((item) => {
        const currentPlan = item.price_plans?.find(plan => plan.billingCycle === (isAnnual ? 'annual' : 'monthly'));
        
        return (
          <div
            key={item.id}
            className="w-full lg:w-[32rem] h-full px-6 sm:px-8 bg-n-8 border border-n-6 rounded-[2rem] py-8 sm:py-14 [&>h4]:first:text-color-2 [&>h4]:even:text-color-1 [&>h4]:last:text-color-3"
          >
            <h4 className="h4 mb-4">{item.title}</h4>

            <p className="body-2 min-h-[4rem] mb-3 text-n-1/50">
              {item.description}
            </p>

            <div className="flex flex-wrap items-center h-auto sm:h-[5.5rem] mb-6">
              {currentPlan && currentPlan.price && (
                <>
                  <div className="h3">$</div>
                  <div className="text-[3.5rem] sm:text-[5.5rem] leading-none font-bold">
                    {isAnnual 
                      ? currentPlan.price.split('/')[0]
                      : currentPlan.price.split('/')[0]
                    }
                  </div>
                  <div className="text-n-1/50 ml-2">/month</div>
                  {isAnnual && currentPlan.og_price && (
                    <div className="ml-0 mt-2 sm:ml-4 sm:mt-0 w-full sm:w-auto flex flex-col items-start">
                      <span className="text-green-500 line-through text-xl sm:text-2xl">
                        ${currentPlan.og_price.split('/')[0]}/month
                      </span>
                      <span className="text-n-1/50 text-sm sm:text-base mt-1">
                        Billed as ${parseInt(currentPlan.price) * 12}/year
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <Button
              className="w-full mb-6"
              onClick={() => handleSubscription(currentPlan?.planType, currentPlan?.link)}
              white={!!currentPlan?.price}
            >
              {userPlanType === currentPlan?.planType ? 'Manage Subscription' : item.buttonText}
            </Button>

            <ul className="space-y-1">
              {currentPlan?.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start py-3 border-t border-n-6"
                >
                  <img src={check} width={20} height={20} alt="Check" className="mt-0.5 mr-4 flex-shrink-0" />
                  <p className="text-sm sm:text-base font-normal">{feature}</p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default PricingList;
