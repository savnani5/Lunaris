import React from "react";
import Section from "@/components/landing/components/Section";

const AffiliateTerms = () => {
  return (
    <Section 
      className="py-20"
      id="affiliate-terms"
      crosses={false}
      crossesOffset="0"
      customPaddings={false}
      noHorizontalLine={false}
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Affiliate Terms</h1>
          <p className="text-gray-400 mb-8">Join Lunaris Affiliate Program and receive a recurring commission on subscription payments for paying customers you refer.</p>

          <h2 className="text-3xl font-bold mt-8 mb-4">1. Pay-per-click (PPC) policy - Google Ads</h2>
          <p>The Affiliate is not allowed to use PPC Ads on Google Ads without prior written permission. Unfortunately, we have no way to verify that you are advertising on keywords other than our brand name, which is why we must prohibit the use of Google Ads. If you violate this rule, we will cancel all your commissions since the creation of your account.</p>

          <h2 className="text-3xl font-bold mt-8 mb-4">2. Coupon code website</h2>
          <p>Promoting Lunaris on coupon code websites is prohibited, or your affiliate account will be banned, and no commission will be paid to you.</p>

          <h2 className="text-3xl font-bold mt-8 mb-4">3. Affiliate links</h2>
          <p>The Affiliate may use graphic and text versions of their links on websites, in email messages, social media posts, as well as advertise Lunaris in online and offline ads, magazines, and newspapers. The Affiliate may use the graphics and text provided by Lunaris or create their own as long as they are deemed appropriate according to these Terms and Conditions.</p>

          <h2 className="text-3xl font-bold mt-8 mb-4">4. Commission payout</h2>
          <p>Commissions will be transferred to the Affiliate's PayPal/Bank account monthly, as a payment for the purchases (of monthly or yearly plans) made by referred users in the previous month. There is no cash-out limit, but the minimum is $30.</p>

          <h2 className="text-3xl font-bold mt-8 mb-4">5. Liability</h2>
          <p>Lunaris will not be liable for direct, indirect or accidental damages (loss of revenue, commissions) due to affiliate tracking failures, loss of database files, or any results of intents of harm to the Program and/or to Lunaris.media website(s).</p>
        </div>
      </div>
    </Section>
  );
};

export default AffiliateTerms;
