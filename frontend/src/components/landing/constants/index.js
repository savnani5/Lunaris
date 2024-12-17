import {
  benefitIcon1,
  benefitIcon2,
  benefitIcon3,
  benefitIcon4,
  benefitImage2,
  chromecast,
  disc02,
  discord,
  file02,
  homeSmile,
  notification2,
  notification3,
  notification4,
  plusSquare,
  recording01,
  recording03,
  roadmap1,
  roadmap2,
  roadmap3,
  roadmap4,
  searchMd,
  slack,
  sliders04,
  telegram,
  twitter,
  x,
  fb,
  ig,
  tiktok,
  youtube,
  linkedin
} from "../assets";

export const navigation = [
  {
    id: "0",
    title: "Showcase",
    url: "#showcase",
  },
  {
    id: "1",
    title: "Features",
    url: "#features",
  },
  {
    id: "3",
    title: "Pricing",
    url: "#pricing",
  },
];

export const authLinks = [
  {
    id: "0",
    title: "Sign in",
    url: "/sign-in",
  },
];

export const heroIcons = [homeSmile, file02, searchMd, plusSquare];

export const notificationImages = [notification4, notification3, notification2];

export const companyLogos = [youtube, tiktok, ig, fb, x];

export const brainwaveServices = [
  "Photo generating",
  "Photo enhance",
  "Seamless Integration",
];

export const brainwaveServicesIcons = [
  recording03,
  recording01,
  disc02,
  chromecast,
  sliders04,
];


export const collabText =
  "Our algorithm is optimized to generate most viral content based on latest social media trends";

export const collabContent = [
  {
    id: "0",
    title: "Virality Optimization",
    text: collabText,
  },
  {
    id: "1",
    title: "Autogenerate title and transcript",
  },
  {
    id: "2",
    title: "Post Scheduler",
  },
];

export const collabApps = [
  {
    id: "0",
    title: "Youtube",
    icon: youtube,
    width: 26,
    height: 36,
  },
  {
    id: "1",
    title: "Tiktok",
    icon: tiktok,
    width: 34,
    height: 36,
  },
  {
    id: "2",
    title: "Instagram",
    icon: ig,
    width: 36,
    height: 28,
  },
  {
    id: "3",
    title: "Facebook",
    icon: fb,
    width: 34,
    height: 35,
  },
  {
    id: "4",
    title: "X",
    icon: x,
    width: 34,
    height: 34,
  },
  {
    id: "5",
    title: "Linkedin",
    icon: linkedin,
    width: 34,
    height: 34,
  },
];

export const pricing = [
  {
    id: "0",
    title: "Starter",
    description: "Kickstart your content creation journey with essential tools.",
    buttonText: "Get started",
    price_plans: [
       {
         "link": process.env.NEXT_PUBLIC_STRIPE_MONTHLY_LINK,
         "priceID": process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
         "price": "20/month", 
         "credits": "100",
         "planType": "Starter",
         "billingCycle": "monthly",
         "features": [
          "Get 100 credits per month",
          "Project storage for 30 days",
          "Buy extra credits at a discounted rate",
          "Community support",
          "Project notifications"
        ],
       },
       {
         "link": process.env.NEXT_PUBLIC_STRIPE_YEARLY_LINK,
         "priceID": process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
         "og_price": "20/month",
         "price": "15/month",
         "credits": "1200",
         "planType": "Starter",
         "billingCycle": "annual",
         "features": [
          "Get 1200 credits per year (available instantly)",
          "Project storage for 30 days",
          "Buy extra credits at a discounted rate",
          "Community support",
          "Project notifications"
        ],
       },
    ]
  },
  {
    id: "1",
    title: "Custom",
    description: "Unleash unlimited potential with custom-tailored solutions.",
    buttonText: "Contact us",
    price_plans: [
      {
        "link": "mailto:sales@lunaris.media",
        "priceID": "",
        "price": "",
        "credits": "",
        "planType": "Custom",
        "billingCycle": "monthly",
        "features": [
          "Everything in Starter plan",
          "Customized credits",
          "Dedicated storage",
          "Tailored features",
          "Priority support",
        ],
      },
      {
        "link": "mailto:sales@lunaris.media",
        "priceID": "",
        "og_price": "",
        "price": "",
        "credits": "",
        "planType": "Custom",
        "billingCycle": "annual",
        "features": [
          "Everything in Starter plan",
          "Customized credits",
          "Dedicated storage",
          "Tailored features",
          "Priority support",
        ],
      }
    ]
  },
];

export const benefits = [
  {
    id: "0",
    title: "Auto Repurpose",
    text: "Automatically repurpose your long form content into short and medium form content.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-5.svg",
    iconUrl: benefitIcon4,
    imageUrl: benefitImage2,
  },
  {
    id: "1",
    title: "Automatic captions",
    text: "AI generated subtiltes with over 98% accuracy and custom templates.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-1.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitImage2,
  },
  {
    id: "2",
    title: "Auto Reframe",
    text: "AI automatically reframes the video, detecting the speaker and moving objects for most engagement.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-2.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitImage2,
    light: true,
  },
  {
    id: "3",
    title: "Virality metrics",
    text: "Custom AI metrics that help you curate your content to latest social media trends.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-3.svg",
    iconUrl: benefitIcon3,
    imageUrl: benefitImage2,
  },
  {
    id: "4",
    title: "Publish and Share",
    text: "Instantly publish and share your clips to YouTube, TikTok, Instagram, Facebook, and X from one place.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-4.svg",
    iconUrl: benefitIcon4,
    imageUrl: benefitImage2,
    light: true,
    comingSoon: true,
  },
  {
    id: "5",
    title: "Background music",
    text: "Add background music to your content to make it more engaging.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-6.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitImage2,
    comingSoon: true,
  },
];

export const socials = [
  {
    id: "0",
    title: "Discord",
    iconUrl: discord,
    url: "#",
  },
  {
    id: "1",
    title: "Twitter",
    iconUrl: x,
    url: "https://x.com/lunaris_ai",
  },
  {
    id: "2",
    title: "Instagram",
    iconUrl: ig,
    url: "#",
  },
  {
    id: "3",
    title: "Youtube",
    iconUrl: youtube,
    url: "#",
  },
  {
    id: "4",
    title: "Facebook",
    iconUrl: fb,
    url: "#",
  },
];

export const faqData = [
  {
    id: "0",
    question: "How does Lunaris work?",
    answer: "Lunaris uses advanced AI to understand your video content and current social media trends. It automatically identifies the most engaging moments from your long-form videos and transforms them into attention-grabbing short clips. The platform enhances these clips with dynamic captions, smart layouts, and smooth transitions - making your content ready to go viral across social platforms!"
  },
  {
    id: "1",
    question: "Does Lunaris require video editing skills?",
    answer: "No, Lunaris does not require video editing skills. We have a very simple interface that allows you to upload your video and generate clips with just a few clicks."
  },
  {
    id: "2",
    question: "Is Lunaris free to use?",
    answer: "We offer 60 free credits (60 minutes of processing) to get you started. You can enroll in our starter or custom plan to get more credits and features."
  },
  {
    id: "3",
    question: "Can I add captions?",
    answer: "Absolutely! In fact, Lunaris automatically adds captions for you with over 98% accuracy! You can also choose custom captions with our templates."
  },
  {
    id: "4",
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access to your plan until the end of your current billing period."
  },
];
