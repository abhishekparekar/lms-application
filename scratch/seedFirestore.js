/**
 * Firestore Seed Script — run once with: node scratch/seedFirestore.js
 * Seeds: courses, currentAffairs, resources, quizQuestions, jobs
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCpRlTNQKmyFqUKUo5zH_8ZbyaWZQe-Vec",
  authDomain: "ffhh-5f5b1.firebaseapp.com",
  databaseURL: "https://ffhh-5f5b1-default-rtdb.firebaseio.com",
  projectId: "ffhh-5f5b1",
  storageBucket: "ffhh-5f5b1.firebasestorage.app",
  messagingSenderId: "1060819037700",
  appId: "1:1060819037700:web:3277aa663d612687e00f51",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ═══════════════════════════════════════
// COURSES
// ═══════════════════════════════════════
const courses = [
  {
    id: 'course-rn-expo',
    title: 'React Native & Expo: Ultimate Guide',
    description: 'Master mobile development with React Native, Expo Router, Firebase and TypeScript. Build production apps for iOS, Android and Web.',
    instructor: 'Alex Mercer',
    category: 'Development',
    duration: '22 hrs',
    lessonsCount: 48,
    rating: 4.8,
    price: 49.99,
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop',
    syllabus: [
      'Introduction to React Native and Expo',
      'Understanding Layouts & React Native Components',
      'Advanced Navigation with Expo Router',
      'Styling with StyleSheet & NativeWind',
      'State Management & Local Cache',
      'Firebase Authentication & Firestore Databases',
      'Push Notifications and Device APIs',
      'App Store & Play Store Deployment'
    ],
    modules: [
      {
        id: 'mod-1', title: 'Getting Started', lessons: [
          { id: 'l-1', title: 'Intro to React Native', duration: '12 min', videoUrl: '' },
          { id: 'l-2', title: 'Installing Expo & Tools', duration: '18 min', videoUrl: '' },
        ]
      },
      {
        id: 'mod-2', title: 'Core Components', lessons: [
          { id: 'l-3', title: 'Views, Text & Styling', duration: '25 min', videoUrl: '' },
          { id: 'l-4', title: 'FlatList & ScrollView', duration: '20 min', videoUrl: '' },
        ]
      },
      {
        id: 'mod-3', title: 'Firebase Integration', lessons: [
          { id: 'l-5', title: 'Authentication Setup', duration: '30 min', videoUrl: '' },
          { id: 'l-6', title: 'Firestore CRUD', duration: '35 min', videoUrl: '' },
        ]
      }
    ],
    enrolledUsers: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'course-uiux-design',
    title: 'UI/UX Design Masterclass',
    description: 'Master mobile and web interface design. Learn Figma, design systems, wireframing, high-fidelity prototypes, and user testing.',
    instructor: 'Sarah Jenkins',
    category: 'Design',
    duration: '16 hrs',
    lessonsCount: 32,
    rating: 4.7,
    price: 39.99,
    imageUrl: 'https://images.unsplash.com/photo-1561070791-26c113006238?q=80&w=600&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-26c113006238?q=80&w=600&auto=format&fit=crop',
    syllabus: [
      'Fundamentals of User Experience (UX)',
      'Figma Basics & Typography Guidelines',
      'Creating Modern Design Systems',
      'Responsive Mobile & Web UI Grid Layouts',
      'Interactive Prototyping and Micro-interactions',
      'User Research & Usability Testing'
    ],
    modules: [
      {
        id: 'mod-1', title: 'UX Foundations', lessons: [
          { id: 'l-1', title: 'What is UX Design?', duration: '15 min', videoUrl: '' },
          { id: 'l-2', title: 'User Research Methods', duration: '22 min', videoUrl: '' },
        ]
      },
      {
        id: 'mod-2', title: 'Figma Mastery', lessons: [
          { id: 'l-3', title: 'Figma Interface Overview', duration: '18 min', videoUrl: '' },
          { id: 'l-4', title: 'Auto Layout & Variants', duration: '28 min', videoUrl: '' },
        ]
      }
    ],
    enrolledUsers: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'course-product-mgmt',
    title: 'Product Management Fundamentals',
    description: 'Learn core methodologies of product management: agile sprint planning, user stories, product roadmap design, analytics, and scaling.',
    instructor: 'David Miller',
    category: 'Business',
    duration: '12 hrs',
    lessonsCount: 24,
    rating: 4.6,
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop',
    syllabus: [
      'Role of a Product Manager',
      'User Research & Defining MVP',
      'Agile, Scrum & Product Owner Responsibilities',
      'Metrics & Analytics for Product Success',
      'Creating Roadmap & Release Planning'
    ],
    modules: [
      {
        id: 'mod-1', title: 'PM Fundamentals', lessons: [
          { id: 'l-1', title: 'What is a Product Manager?', duration: '14 min', videoUrl: '' },
          { id: 'l-2', title: 'Understanding Market Research', duration: '20 min', videoUrl: '' },
        ]
      }
    ],
    enrolledUsers: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'course-digital-marketing',
    title: 'Digital Marketing Strategy',
    description: 'Master SEO, social media ads, email marketing, Google Analytics and conversion optimization to grow any business online.',
    instructor: 'Priya Sharma',
    category: 'Marketing',
    duration: '10 hrs',
    lessonsCount: 20,
    rating: 4.5,
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=600&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=600&auto=format&fit=crop',
    syllabus: [
      'Digital Marketing Landscape',
      'SEO Fundamentals & Keyword Research',
      'Google & Meta Ads Deep Dive',
      'Email Marketing & Automation',
      'Analytics & Conversion Rate Optimization'
    ],
    modules: [
      {
        id: 'mod-1', title: 'SEO Basics', lessons: [
          { id: 'l-1', title: 'How Search Engines Work', duration: '12 min', videoUrl: '' },
          { id: 'l-2', title: 'On-Page vs Off-Page SEO', duration: '18 min', videoUrl: '' },
        ]
      }
    ],
    enrolledUsers: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'course-data-science',
    title: 'Data Science with Python',
    description: 'Learn Python for data analysis, machine learning, visualization with Pandas, NumPy, Matplotlib and Scikit-Learn from scratch.',
    instructor: 'Ravi Kumar',
    category: 'Development',
    duration: '28 hrs',
    lessonsCount: 56,
    rating: 4.9,
    price: 59.99,
    imageUrl: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?q=80&w=600&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?q=80&w=600&auto=format&fit=crop',
    syllabus: [
      'Python Basics for Data Science',
      'NumPy Arrays & Pandas DataFrames',
      'Data Visualization with Matplotlib & Seaborn',
      'Machine Learning with Scikit-Learn',
      'Deep Learning Intro with TensorFlow',
      'Capstone: Real Dataset Analysis Project'
    ],
    modules: [
      {
        id: 'mod-1', title: 'Python for Data Science', lessons: [
          { id: 'l-1', title: 'Python Setup & Jupyter Notebooks', duration: '16 min', videoUrl: '' },
          { id: 'l-2', title: 'Variables, Lists & Dictionaries', duration: '22 min', videoUrl: '' },
        ]
      },
      {
        id: 'mod-2', title: 'Data Analysis', lessons: [
          { id: 'l-3', title: 'Pandas: Loading & Cleaning Data', duration: '28 min', videoUrl: '' },
          { id: 'l-4', title: 'GroupBy, Merge & Pivot Tables', duration: '25 min', videoUrl: '' },
        ]
      }
    ],
    enrolledUsers: [],
    createdAt: new Date().toISOString(),
  }
];

// ═══════════════════════════════════════
// CURRENT AFFAIRS
// ═══════════════════════════════════════
const currentAffairs = [
  {
    id: 'ca-1',
    title: 'Global Tech Summit 2026: AI & Agentic Systems',
    category: 'Technology',
    date: 'June 24, 2026',
    summary: 'Leading tech firms announced joint standardizations for advanced agentic AI networks. New mobile OS permission frameworks were also unveiled for better privacy control.',
    content: 'At the Global Tech Summit held in Singapore, representatives from major tech corporations including Google, Microsoft, Meta and Apple unveiled a comprehensive framework for governing autonomous AI agents. The framework focuses on accountability, transparency, and safety guardrails for agentic systems operating in high-stakes environments...',
    imageUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?q=80&w=400&auto=format&fit=crop',
    bookmarkedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ca-2',
    title: 'New Employment Regulations in the Tech Sector',
    category: 'Economy & Jobs',
    date: 'June 22, 2026',
    summary: 'New guidelines clarify remote work contracts, health insurances, and cross-border freelancer taxation codes for technology professionals worldwide.',
    content: 'A new set of international employment guidelines has been published by the ILO (International Labour Organization) specifically targeting technology sector workers. The guidelines address the gray areas in remote work arrangements, health coverage for contractors, and tax obligations for cross-border digital nomads...',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=400&auto=format&fit=crop',
    bookmarkedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ca-3',
    title: 'Breakthrough in Solid-State Battery Technology',
    category: 'Science',
    date: 'June 18, 2026',
    summary: 'Scientists unveiled a solid-state battery capable of charging fully in under 3 minutes with double the lifecycle capacity of conventional lithium-ion batteries.',
    content: 'Researchers at the Seoul National University of Technology, in collaboration with a leading battery startup, have demonstrated a solid-state battery prototype that charges to 100% in less than 3 minutes. The battery uses a proprietary ceramic electrolyte compound that prevents thermal runaway and degradation...',
    imageUrl: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=400&auto=format&fit=crop',
    bookmarkedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ca-4',
    title: 'India Skills Gap Report 2026: Top Demanded Skills',
    category: 'Education',
    date: 'June 15, 2026',
    summary: 'A new report reveals the 10 most in-demand skills for 2026 including AI prompting, cloud architecture, data analysis, and mobile app development.',
    content: 'The National Skills Development Corporation (NSDC) has released its annual Skills Gap Report, highlighting a critical shortage of tech-savvy professionals in India. The report surveyed over 2,000 companies and 50,000 job seekers, identifying the widest gaps in AI/ML, cloud computing, data science, and mobile development...',
    imageUrl: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=80&w=400&auto=format&fit=crop',
    bookmarkedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ca-5',
    title: 'Supreme Court Upholds Right to Digital Privacy',
    category: 'Law & Governance',
    date: 'June 10, 2026',
    summary: 'In a landmark ruling, the Supreme Court unanimously upheld a constitutional right to digital privacy, mandating explicit consent for data collection by corporations.',
    content: 'In a unanimous decision, the Supreme Court of India declared that digital privacy is a fundamental right under Article 21 of the Constitution. The ruling mandates that all corporations collecting personal data must obtain explicit, informed consent, and must provide users with the ability to delete their data within 30 days of request...',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=400&auto=format&fit=crop',
    bookmarkedBy: [],
    createdAt: new Date().toISOString(),
  }
];

// ═══════════════════════════════════════
// STUDY RESOURCES
// ═══════════════════════════════════════
const resources = [
  {
    id: 'res-1',
    title: 'React Native & TypeScript Quick Reference',
    category: 'Development',
    type: 'PDF Cheat Sheet',
    size: '2.4 MB',
    pdfUrl: 'https://www.typescriptlang.org/assets/typescript-handbook.pdf',
    downloads: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'res-2',
    title: 'Figma Mobile App Design UI Kit Guide',
    category: 'Design',
    type: 'PDF Guide',
    size: '5.8 MB',
    pdfUrl: 'https://helpx.adobe.com/pdf/xd_reference.pdf',
    downloads: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'res-3',
    title: 'Technical Resume Template & Writing Guide',
    category: 'Career',
    type: 'PDF Template',
    size: '1.1 MB',
    pdfUrl: 'https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs.pdf',
    downloads: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'res-4',
    title: 'Data Structures & Algorithms Interview Bible',
    category: 'Development',
    type: 'PDF Study Guide',
    size: '8.2 MB',
    pdfUrl: 'https://www.cs.princeton.edu/courses/archive/spr09/cos333/beautiful.pdf',
    downloads: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'res-5',
    title: 'Product Manager Interview Prep 2026',
    category: 'Business',
    type: 'PDF Workbook',
    size: '3.5 MB',
    pdfUrl: 'https://productschool.com/resources/pdfs/product-management-book-of-knowledge.pdf',
    downloads: 0,
    createdAt: new Date().toISOString(),
  }
];

// ═══════════════════════════════════════
// QUIZ QUESTIONS
// ═══════════════════════════════════════
const quizQuestions = {
  'course-rn-expo': [
    { id: 'q1', text: 'Which command starts an Expo development server?', options: ['expo init', 'npx expo start', 'expo run:android', 'expo build'], correctIndex: 1 },
    { id: 'q2', text: 'Which hook provides current route pathname in Expo Router?', options: ['useNavigation', 'usePathname', 'useRouter', 'useLocalSearchParams'], correctIndex: 1 },
    { id: 'q3', text: 'Which package handles offline auth persistence in Expo?', options: ['AsyncStorage', 'SecureStore', 'SQLite', 'FileSystem'], correctIndex: 0 },
    { id: 'q4', text: 'What does the <Slot /> component do in Expo Router _layout.tsx?', options: ['Creates a new tab', 'Renders the active child route', 'Initializes navigation', 'Provides safe area'], correctIndex: 1 },
    { id: 'q5', text: 'Which StyleSheet property creates responsive percentage widths in React Native?', options: ['flex: 1', "width: '50%'", 'maxWidth: 200', 'alignSelf: stretch'], correctIndex: 1 },
  ],
  'course-uiux-design': [
    { id: 'q1', text: 'What does "UX" stand for?', options: ['User eXperience', 'Unified eXchange', 'Universal eXecution', 'User eXtension'], correctIndex: 0 },
    { id: 'q2', text: 'Which Figma feature allows you to create reusable component instances?', options: ['Frames', 'Components', 'Groups', 'Pages'], correctIndex: 1 },
    { id: 'q3', text: 'What is the primary goal of usability testing?', options: ['Showcasing the design', 'Finding user pain points', 'Creating wireframes', 'Writing code'], correctIndex: 1 },
  ],
  'course-product-mgmt': [
    { id: 'q1', text: 'What does MVP stand for in product management?', options: ['Most Valuable Product', 'Minimum Viable Product', 'Maximum Value Proposition', 'Modular Value Pipeline'], correctIndex: 1 },
    { id: 'q2', text: 'Which framework does Agile use for sprint-based development?', options: ['Kanban', 'Waterfall', 'Scrum', 'Lean'], correctIndex: 2 },
    { id: 'q3', text: 'What metric measures percentage of users completing a desired action?', options: ['DAU', 'NPS', 'Conversion Rate', 'Churn Rate'], correctIndex: 2 },
  ],
};

// ═══════════════════════════════════════
// JOBS
// ═══════════════════════════════════════
const jobs = [
  {
    id: 'job-rn-dev',
    title: 'Junior React Native Developer',
    company: 'TechSolve India',
    logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=150&auto=format&fit=crop',
    location: 'Bangalore, India (Remote)',
    type: 'Full-time',
    experienceLevel: 'Entry Level',
    description: 'Build and maintain mobile apps using React Native and Expo. Work alongside senior engineers to implement features for our learning platform products.',
    requirements: ['Basic JavaScript / TypeScript knowledge', 'Familiarity with React Native lifecycle', 'Experience with REST APIs', 'Strong communication skills'],
    salaryRange: '₹4L - ₹7L/yr',
    postedDate: '2026-06-22',
    applicantsCount: 14,
    recruiterId: 'recruiter-admin',
    savedBy: [],
  },
  {
    id: 'job-senior-mobile',
    title: 'Senior Mobile Engineer (iOS & Android)',
    company: 'InnovateTech Corp',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=150&auto=format&fit=crop',
    location: 'Mumbai, India (Hybrid)',
    type: 'Full-time',
    experienceLevel: 'Senior Level',
    description: 'Lead development of our flagship mobile application. Optimize app performance, implement complex animations, and mentor junior developers.',
    requirements: ['5+ years software development', '3+ years React Native production experience', 'Native iOS/Android bridge knowledge', 'Performance profiling expertise'],
    salaryRange: '₹20L - ₹35L/yr',
    postedDate: '2026-06-20',
    applicantsCount: 5,
    recruiterId: 'recruiter-admin',
    savedBy: [],
  },
  {
    id: 'job-fullstack-intern',
    title: 'Full Stack Developer Intern',
    company: 'StartupLabs',
    logoUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=150&auto=format&fit=crop',
    location: 'Remote (India)',
    type: 'Internship',
    experienceLevel: 'Entry Level',
    description: 'Join our fast-paced product squad. Write code for Node.js backends and build React frontends. Perfect for students or bootcamp grads.',
    requirements: ['Familiarity with Node.js and Express', 'HTML, CSS, React basics', 'Strong communication', 'Self-starter attitude'],
    salaryRange: '₹15,000 - ₹25,000/month',
    postedDate: '2026-06-23',
    applicantsCount: 22,
    recruiterId: 'recruiter-admin',
    savedBy: [],
  },
  {
    id: 'job-uiux-designer',
    title: 'UI/UX Designer',
    company: 'DesignForward Studios',
    logoUrl: 'https://images.unsplash.com/photo-1561070791-26c113006238?q=80&w=150&auto=format&fit=crop',
    location: 'Delhi, India (On-site)',
    type: 'Full-time',
    experienceLevel: 'Mid Level',
    description: 'Create stunning user interfaces for B2B SaaS products. Collaborate with product managers and developers to bring designs to life.',
    requirements: ['3+ years Figma experience', 'Strong portfolio of mobile/web designs', 'Knowledge of design systems', 'User testing experience'],
    salaryRange: '₹8L - ₹14L/yr',
    postedDate: '2026-06-21',
    applicantsCount: 31,
    recruiterId: 'recruiter-admin',
    savedBy: [],
  },
  {
    id: 'job-data-analyst',
    title: 'Data Analyst',
    company: 'DataMetrics Pvt Ltd',
    logoUrl: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?q=80&w=150&auto=format&fit=crop',
    location: 'Hyderabad, India (Remote)',
    type: 'Contract',
    experienceLevel: 'Entry Level',
    description: 'Analyse business data using Python and SQL. Build dashboards in Power BI and Tableau to help business teams make data-driven decisions.',
    requirements: ['Python/SQL proficiency', 'Experience with Pandas & NumPy', 'Power BI or Tableau knowledge', 'Strong analytical thinking'],
    salaryRange: '₹5L - ₹9L/yr',
    postedDate: '2026-06-19',
    applicantsCount: 18,
    recruiterId: 'recruiter-admin',
    savedBy: [],
  }
];

// ═══════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════
async function seedCollection(collectionName, items) {
  const batch = writeBatch(db);
  for (const item of items) {
    const ref = doc(db, collectionName, item.id);
    batch.set(ref, item, { merge: false });
  }
  await batch.commit();
  console.log(`✅ Seeded ${items.length} documents into '${collectionName}'`);
}

async function seedQuizQuestions() {
  let total = 0;
  for (const [courseId, questions] of Object.entries(quizQuestions)) {
    for (const q of questions) {
      await setDoc(doc(db, 'quizQuestions', `${courseId}_${q.id}`), {
        ...q,
        courseId,
      });
      total++;
    }
  }
  console.log(`✅ Seeded ${total} quiz questions into 'quizQuestions'`);
}

async function main() {
  console.log('🌱 Starting Firestore seed...\n');
  try {
    await seedCollection('courses', courses);
    await seedCollection('currentAffairs', currentAffairs);
    await seedCollection('resources', resources);
    await seedCollection('jobs', jobs);
    await seedQuizQuestions();
    console.log('\n🎉 All collections seeded successfully!');
  } catch (e) {
    console.error('❌ Seed failed:', e);
  }
  process.exit(0);
}

main();
