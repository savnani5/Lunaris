import {
  benefitIcon1,
  benefitIcon2,
  benefitIcon3,
  benefitIcon4,
  benefitImage2,
  chromecast,
  disc02,
  discord,
  discordBlack,
  facebook,
  figma,
  file02,
  framer,
  homeSmile,
  instagram,
  notification2,
  notification3,
  notification4,
  notion,
  photoshop,
  plusSquare,
  protopie,
  raindrop,
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
    id: "2",
    title: "Pricing",
    url: "#pricing",
  },
  {
    id: "3",
    title: "Roadmap",
    url: "#roadmap",
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

export const roadmap = [
  {
    id: "0",
    title: "Voice recognition",
    text: "Enable the chatbot to understand and respond to voice commands, making it easier for users to interact with the app hands-free.",
    date: "May 2023",
    status: "done",
    imageUrl: roadmap1,
    colorful: true,
  },
  {
    id: "1",
    title: "Gamification",
    text: "Add game-like elements, such as badges or leaderboards, to incentivize users to engage with the chatbot more frequently.",
    date: "May 2023",
    status: "progress",
    imageUrl: roadmap2,
  },
  {
    id: "2",
    title: "Chatbot customization",
    text: "Allow users to customize the chatbot's appearance and behavior, making it more engaging and fun to interact with.",
    date: "May 2023",
    status: "done",
    imageUrl: roadmap3,
  },
  {
    id: "3",
    title: "Integration with APIs",
    text: "Allow the chatbot to access external data sources, such as weather APIs or news APIs, to provide more relevant recommendations.",
    date: "May 2023",
    status: "progress",
    imageUrl: roadmap4,
  },
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
    title: "Basic",
    description: "AI chatbot, personalized recommendations",
    price: "0",
    features: [
      "An AI chatbot that can understand your queries",
      "Personalized recommendations based on your preferences",
      "Ability to explore the app and its features without any cost",
    ],
  },
  {
    id: "1",
    title: "Premium",
    description: "Advanced AI chatbot, priority support, analytics dashboard",
    price: "9.99",
    features: [
      "An advanced AI chatbot that can understand complex queries",
      "An analytics dashboard to track your conversations",
      "Priority support to solve issues quickly",
    ],
  },
  {
    id: "2",
    title: "Enterprise",
    description: "Custom AI chatbot, advanced analytics, dedicated account",
    price: null,
    features: [
      "An AI chatbot that can understand your queries",
      "Personalized recommendations based on your preferences",
      "Ability to explore the app and its features without any cost",
    ],
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
    url: "#",
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
