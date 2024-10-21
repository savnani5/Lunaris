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
  // {
  //   id: "2",
  //   title: "Collaboration",
  //   url: "#collaboration",
  // },
  {
    id: "3",
    title: "Pricing",
    url: "#pricing",
  },
  {
    id: "4",
    title: "Sign In",
    url: "/sign-in",
    onlyMobile: true,
  },
  {
    id: "5",
    title: "Sign Up",
    url: "/sign-up",
    onlyMobile: true,
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
    title: "Post Scheduler",
  },
  {
    id: "2",
    title: "Autogenerate title and hashtags",
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
         "link": process.env.NODE_ENV === 'development' ? "https://buy.stripe.com/test_5kAbJu3218Pf0XmeV0" : "",
         "priceID": process.env.NODE_ENV === 'development' ? "price_1Q8ptJ06DvcoKeSzonbKvnTk" : "",
         "price": "15/month", 
         "credits": "100",
         "planType": "Starter",
         "billingCycle": "monthly",
         "features": [
          "Get 100 credits per month",
          "Project storage for 30 days",
          "Ability to buy extra credits at a discounted rate",
          "Community support",
          "Project notifications"
        ],
       },
       {
         "link": process.env.NODE_ENV === 'development' ? "https://buy.stripe.com/test_cN24h20TT3uVgWkcMT" : "",
         "priceID": process.env.NODE_ENV === 'development' ? "price_1Q8ptl06DvcoKeSzJOSPvKd3" : "",
         "og_price": "180/year",
         "price": "149/year",
         "credits": "1200",
         "planType": "Starter",
         "billingCycle": "annual",
         "features": [
          "Get 1200 credits per year (available instantly)",
          "Project storage for 30 days",
          "Ability to buy extra credits at a discounted rate",
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
    title: "Automatic captions",
    text: "AI generated subtiltes with over 98% accuracy and custom templates.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-1.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitImage2,
  },
  {
    id: "1",
    title: "Auto Reframe",
    text: "AI automatically reframes the video, detecting the speaker and moving objects for most engagement.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-2.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitImage2,
    light: true,
  },
  {
    id: "2",
    title: "Virality metrics",
    text: "Custom AI metrics that help you curate your content to latest social media trends.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-3.svg",
    iconUrl: benefitIcon3,
    imageUrl: benefitImage2,
  },
  {
    id: "3",
    title: "Publish and Share",
    text: "Instantly publish and share your clips to YouTube, TikTok, Instagram, Facebook, and X.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-4.svg",
    iconUrl: benefitIcon4,
    imageUrl: benefitImage2,
    light: true,
  },
  {
    id: "4",
    title: "Video Editor",
    text: "Edit your videos in real time using our advanced timeline based video editor.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-5.svg",
    iconUrl: benefitIcon1,
    imageUrl: benefitImage2,
  },
  {
    id: "5",
    title: "AI voice narration and music",
    text: "Make your content dynamic and engaging with AI voice narration and music.",
    // backgroundUrl: "./src/components/landing/assets/benefits/card-6.svg",
    iconUrl: benefitIcon2,
    imageUrl: benefitImage2,
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
