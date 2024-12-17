'use client'

import { useState } from "react";
import Section from "./Section";
import Heading from "./Heading";
import { faqData } from "../constants";
import { motion, AnimatePresence } from "framer-motion";

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-n-6">
      <button
        className="flex items-center justify-between w-full py-6 px-8 hover:bg-n-7/25 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-base md:text-lg font-semibold mr-2 text-left">
          {question}
        </span>
        <div className={`relative flex-shrink-0 ml-4 w-6 h-6 ${isOpen ? 'rotate-45' : ''} transition-transform duration-300`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-0.5 bg-n-1"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-n-1"></div>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-n-7/10"
          >
            <p className="px-8 pb-6 text-n-4 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Faq = () => {
  return (
    <Section className="overflow-hidden" id="faq">
      <div className="container relative z-2">
        <Heading
          tag="Got questions?"
          title="Frequently asked questions"
          text="Everything you need to know about Lunaris and its features."
        />
        
        <div className="relative">
          <div className="relative z-1 grid gap-6 lg:gap-8 max-w-[55rem] mx-auto">
            {faqData.map((item) => (
              <div
                className="relative overflow-hidden p-0.5 rounded-2xl transition-all duration-300"
                style={{
                  background: 'linear-gradient(180deg, rgba(25, 25, 25, 0.7) 0%, rgba(25, 25, 25, 0.3) 100%)'
                }}
                key={item.id}
              >
                <div className="relative bg-n-8 rounded-[14px] transition-colors">
                  <FaqItem
                    question={item.question}
                    answer={item.answer}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Subtle background gradient */}
          <div className="absolute -top-48 left-1/2 w-[51.375rem] aspect-square -translate-x-1/2 pointer-events-none opacity-20 mix-blend-color-dodge">
            <div className="absolute inset-0 rotate-[-42deg] scale-[0.8] bg-gradient-to-r from-n-6/0 via-n-6/50 to-n-6/0 blur-[100px]" />
          </div>
        </div>

        {/* Support link */}
        <div className="flex justify-center mt-12">
          <a 
            href="mailto:support@lunaris.media" 
            className="group inline-flex items-center font-code text-xs tracking-wider uppercase text-n-1/50 hover:text-n-1 transition-colors"
          >
            <span className="mr-2">Still have questions?</span>
            <span className="text-color-1 group-hover:translate-x-1 transition-transform">
              Contact Support →
            </span>
          </a>
        </div>
      </div>
    </Section>
  );
};

export default Faq;