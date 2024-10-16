'use client'

import { useState } from "react";
import Section from "./Section";
import Heading from "./Heading";
import Button from "./Button";
import PricingList from "./PricingList";
import { LeftLine, RightLine } from "./design/Pricing";

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <Section className="overflow-hidden" id="pricing">
      <div className="container relative z-2">
        <Heading
          tag="Get started with Lunaris"
          title="Choose a plan"
        />

        <div className="flex justify-center items-center mb-8">
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

        <div className="relative">
          <PricingList isAnnual={isAnnual} />
          <LeftLine />
          <RightLine />
        </div>
      </div>
      <div className="container md:pb-10 mt-16 md:mt-20 xl:mt-24">
        <div className="flex justify-center mt-12 md:mt-15 xl:mt-20">
          <a href="mailto:support@lunaris.media">
            <Button>Contact Support</Button>
          </a>
        </div>
      </div>
    </Section>
  );
};

export default Pricing;
