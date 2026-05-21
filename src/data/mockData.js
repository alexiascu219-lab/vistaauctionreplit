// Mock database for Vista Auction Careers HR Portal

export const initialJobs = [
  {
    id: "job-1",
    title: "Warehouse Processing Associate",
    department: "Operations",
    location: "Charlotte, NC (Sardis Rd)",
    salary: "$16.50 - $19.00 / hr",
    type: "Full-Time",
    posted: "2 days ago",
    description: "Responsible for receiving, unpacking, sorting, and grading overstock, box-damaged, and customer-returned merchandise from top retailers. Must be comfortable in a fast-paced environment and capable of lifting up to 50 lbs.",
    requirements: [
      "Ability to work in a fast-paced, physical warehouse environment",
      "Basic tech proficiency to operate mobile inventory scanners",
      "Strong attention to detail to accurately grade product conditions",
      "Team player with a positive attitude"
    ]
  },
  {
    id: "job-2",
    title: "Product Cataloger & Grader",
    department: "Cataloging",
    location: "Charlotte, NC (Sardis Rd)",
    salary: "$17.00 - $20.00 / hr",
    type: "Full-Time",
    posted: "1 week ago",
    description: "Accurately inspect, describe, photograph, and upload returned items to the online auction platform. Catalogers are responsible for verifying item completeness, noting box damage, and assigning correct categories.",
    requirements: [
      "Excellent descriptive writing and documentation skills",
      "High attention to detail (spotting missing accessories, box damage)",
      "Familiarity with consumer electronics, tools, and general merchandise",
      "Speed and efficiency in catalog entry software"
    ]
  },
  {
    id: "job-3",
    title: "Customer Pickup Associate",
    department: "Customer Service",
    location: "Monroe, NC (Sutherland Ave)",
    salary: "$16.00 - $18.00 / hr",
    type: "Full-Time / Part-Time",
    posted: "3 days ago",
    description: "Assist customers in retrieving and loading their won auction items. Verify invoices, retrieve packages from warehouse bins, and resolve pickup discrepancies with a professional, customer-first attitude.",
    requirements: [
      "Outstanding face-to-face customer service and communication skills",
      "Ability to navigate warehouse storage systems quickly",
      "Physical stamina to stand/walk and lift items during busy pickup windows",
      "Experience handling point-of-sale systems is a plus"
    ]
  },
  {
    id: "job-4",
    title: "Forklift Operator / Warehouse Logistics",
    department: "Logistics",
    location: "Charlotte, NC (Sardis Rd)",
    salary: "$19.00 - $22.50 / hr",
    type: "Full-Time",
    posted: "5 days ago",
    description: "Safely operate forklifts and pallet jacks to load/unload freight trucks, move bulk pallets of liquidation merchandise, and organize overhead racks. Ensure safety standards are met at all times.",
    requirements: [
      "Active forklift certification (OSHA compliant)",
      "Minimum 1-2 years experience in pallet racking and bulk loading",
      "Familiarity with safety regulations and procedures",
      "Ability to work cohesive shift schedules"
    ]
  },
  {
    id: "job-5",
    title: "Operations Shift Supervisor",
    department: "Management",
    location: "Monroe, NC (Sutherland Ave)",
    salary: "$22.00 - $26.00 / hr",
    type: "Full-Time",
    posted: "2 weeks ago",
    description: "Supervise a shift team of warehouse and cataloging associates. Manage daily volume targets, audit item descriptions for quality assurance, lead safety huddles, and coordinate local customer pickup queues.",
    requirements: [
      "2+ years experience in a warehouse leadership or supervisory role",
      "Strong analytical skills to monitor team throughput metrics",
      "Proven problem-solving skills for inventory and pickup bottlenecks",
      "Active forklift certification is a plus"
    ]
  }
];

export const initialCandidates = [
  {
    id: "cand-1",
    name: "Sarah Jenkins",
    email: "sarah.j@example.com",
    phone: "704-555-0199",
    appliedRole: "Product Cataloger & Grader",
    appliedJobId: "job-2",
    appliedDate: "May 15, 2026",
    status: "Interviewing",
    statusIndex: 2, // 0: Applied, 1: Screened, 2: Interviewing, 3: Offer, 4: Hired
    aiScore: 92,
    resumeText: "Detail-oriented catalog coordinator with 2 years in retail inventory control and e-commerce listings. Experienced in listing verification, detailed item descriptions, and digital photography. Dedicated to precision and sorting accuracy.",
    skills: ["Product Grading", "E-commerce Listings", "Digital Photography", "Data Entry", "Retail Operations"],
    experience: [
      { role: "Inventory Clerk", company: "Target", duration: "2024 - Present" },
      { role: "eBay Listing Assistant", company: "Retro Finds Resale", duration: "2023 - 2024" }
    ],
    aiReport: {
      summary: "Highly compatible candidate with direct listing and inventory experience. Demonstrates excellent speed and eye for detail, crucial for high-throughput liquidation grading.",
      strengths: ["Direct experience writing e-commerce listing descriptions", "Familiarity with retail grading/returns", "Strong computer and data entry speed"],
      weaknesses: ["Has not worked in high-volume industrial warehouse auctions", "Limited experience operating heavy scanners"],
      opportunities: ["Can quickly transition into a leadership role for cataloging teams due to detail accuracy", "Could cross-train in customer service pickups"],
      threats: ["May find the fast-paced warehouse temperature shifts challenging during peak seasons"]
    }
  },
  {
    id: "cand-2",
    name: "Michael Chang",
    email: "m.chang@example.com",
    phone: "980-555-2041",
    appliedRole: "Warehouse Processing Associate",
    appliedJobId: "job-1",
    appliedDate: "May 17, 2026",
    status: "Screened",
    statusIndex: 1,
    aiScore: 88,
    resumeText: "Energetic logistics assistant with experience in package sorting, pallet organizing, and scanner operations. OSHA safety compliance certified. Handled high-volume distribution pipelines for FedEx.",
    skills: ["Pallet Stacking", "RF Scanners", "Inventory Control", "Heavy Lifting", "Safety Compliance"],
    experience: [
      { role: "Package Handler", company: "FedEx Ground", duration: "2024 - 2026" },
      { role: "Store Stocker", company: "Lidl US", duration: "2023 - 2024" }
    ],
    aiReport: {
      summary: "Solid operations candidate with high physical capacity and distribution experience. Strong safety mindset aligns well with warehouse pallet movement standards.",
      strengths: ["Extensive heavy lifting and scanning experience", "OSHA safety awareness", "Thrives in active environments"],
      weaknesses: ["Less experience with detailed itemized grading", "Prefers strictly structured tasks"],
      opportunities: ["Forklift certification pathway training", "Logistics coordination backup roles"],
      threats: ["Higher turnover risk if seeking higher specialized technical roles"]
    }
  },
  {
    id: "cand-3",
    name: "Emily Rodriguez",
    email: "emily.rod@example.com",
    phone: "704-555-0122",
    appliedRole: "Customer Pickup Associate",
    appliedJobId: "job-3",
    appliedDate: "May 18, 2026",
    status: "Applied",
    statusIndex: 0,
    aiScore: 79,
    resumeText: "Experienced customer service representative and cashier. Passionate about solving guest issues, handling point-of-sale systems, and coordinating front-of-house organization. Fluent in English and Spanish.",
    skills: ["Bilingual Customer Support", "Point-of-Sale (POS)", "Conflict Resolution", "Verbal Communication"],
    experience: [
      { role: "Guest Services Representative", company: "Target", duration: "2023 - Present" },
      { role: "Cashier", company: "Harris Teeter", duration: "2021 - 2023" }
    ],
    aiReport: {
      summary: "Strong customer-facing representative. Bilingual capabilities provide a significant advantage for coordinating local pickups with Charlotte's diverse demographic.",
      strengths: ["Excellent verbal conflict resolution skills", "Bilingual in Spanish", "Familiarity with ticketing/payment validation"],
      weaknesses: ["Minimal warehouse organization exposure", "Has not operated heavy equipment or inventory layouts"],
      opportunities: ["Direct support during busy weekend pickup windows", "Translation lead for Monroe location"],
      threats: ["Might find physical retrieval tasks exhausting compared to desk retail environments"]
    }
  },
  {
    id: "cand-4",
    name: "David Kim",
    email: "david.kim@example.com",
    phone: "704-555-0988",
    appliedRole: "Forklift Operator / Warehouse Logistics",
    appliedJobId: "job-4",
    appliedDate: "May 14, 2026",
    status: "Hired",
    statusIndex: 4,
    aiScore: 95,
    resumeText: "Certified Forklift Operator (Stand-up, Reach, Sit-down) with 4 years of industrial warehouse logistics experience. Safe driver record, skilled in loading high-racks, freight unloading, and inventory auditing.",
    skills: ["Forklift Certification", "High-Bay Racking", "Freight Manifests", "Inventory Audits", "Team Safety"],
    experience: [
      { role: "Forklift Operator", company: "Amazon Fulfillment", duration: "2023 - 2026" },
      { role: "Warehouse Associate", company: "Home Depot DC", duration: "2021 - 2023" }
    ],
    aiReport: {
      summary: "Exceptional candidate. Experienced with logistics, heavy inventory movement, and warehouse safety. Pre-screened with high-bay loading simulation with 100% accuracy.",
      strengths: ["Active certified operator across all forklift models", "Strong warehouse layout knowledge", "Outstanding safety record"],
      weaknesses: ["Seeking premium shifts", "Not looking for customer service pickups"],
      opportunities: ["Potential shift lead or safety coordinator in 6-12 months", "Optimize truck unloading cycles"],
      threats: ["Competitive market value, requires competitive compensation to retain"]
    }
  }
];

export const mockQuestions = {
  "job-1": [
    "Tell me about a time you had to deal with a fast-paced work environment. How did you manage stress?",
    "Vista Auction receives hundreds of pallets of returned goods daily. How do you maintain accuracy when sorting boxes for hours?",
    "If you notice a team member lifting heavy items unsafely, what would you do?"
  ],
  "job-2": [
    "Explain how you would handle an item that is missing its power cable. How would you describe it in the online catalog?",
    "Detail your process for identifying a counterfeit or wrong item returned in a branded retail box.",
    "Cataloging requires speed and accuracy. How do you balance writing precise descriptions with daily output quotas?"
  ],
  "job-3": [
    "How would you handle a customer who won an auction but is upset because the item description didn't mention it was missing a minor part?",
    "During pickup windows, lines can grow long. How do you prioritize serving customers while keeping the warehouse staging area organized?",
    "Describe a time you solved a invoice discrepancy with a client. What was the outcome?"
  ],
  "job-4": [
    "Describe your experience operating forklifts in high-rack environments. What safety checks do you perform before starting?",
    "What steps do you take when a pallet of returned items is unstable or damaged during unloading?",
    "How do you coordinate with ground crew associates when backing up a forklift in a loud, busy space?"
  ],
  "job-5": [
    "How do you motivate a shift team when target quotas are lagging behind?",
    "If an employee is consistently cataloging items with incorrect conditions, how would you address and coach them?",
    "Describe how you would handle a major logistical bottleneck where customer pickups and incoming cargo truck deliveries overlap."
  ]
};

export const catalogerMiniGameItems = [
  {
    id: "item-1",
    name: "Ninja Professional Blender",
    retailPrice: "$129.99",
    imageUrl: "🥤",
    actualCondition: "Open Box - Tested Working",
    correctAnswers: {
      condition: "open_box",
      damageSelected: "none",
      missingAccessories: "none",
      gradingNote: "Appears unused, tested motor runs perfectly, all blades and cups clean."
    },
    damagePrompt: "The box has a slight scuff on the side, but the blender is pristine. All accessories are present.",
    damageOptions: ["No Damage", "Smashed Box", "Item Scratched", "Damaged Cord"]
  },
  {
    id: "item-2",
    name: "Samsung 32\" Curved Monitor",
    retailPrice: "$249.99",
    imageUrl: "🖥️",
    actualCondition: "Damaged Box - Screen Cracked",
    correctAnswers: {
      condition: "damaged",
      damageSelected: "screen_crack",
      missingAccessories: "power_adapter",
      gradingNote: "Severe screen crack on top left quadrant. Power cord is missing. Outer box is crushed."
    },
    damagePrompt: "Inspect: The screen has web-like cracks on the top-left, and the box is heavily dented. Looking inside, the power adapter is missing.",
    damageOptions: ["No Damage", "Screen Cracked", "Stand Scratched", "Buttons Broken"]
  },
  {
    id: "item-3",
    name: "DeWalt 20V Max Drill Kit",
    retailPrice: "$159.00",
    imageUrl: "🪛",
    actualCondition: "Like New - Missing Charger",
    correctAnswers: {
      condition: "missing_accessories",
      damageSelected: "none",
      missingAccessories: "charger",
      gradingNote: "Drill and battery are in excellent, clean shape, but battery charger is missing."
    },
    damagePrompt: "Inspect: The hard plastic carrying case is clean, drill and battery look untouched. However, the battery charger slot is empty.",
    damageOptions: ["No Damage", "Case Cracked", "Drill Dirty", "Chuck Broken"]
  }
];

export const aiAssistantPromptResponses = {
  greet: "Hi there! I am the Vista Auction AI Careers Assistant. I can help you find jobs that fit your profile, explain what it is like to work here, or help you practice for your interview. Ask me anything!",
  culture: "At Vista Auction, we pride ourselves on being a fast-paced, family-owned online liquidation marketplace. Employees thrive on hands-on learning, teamwork, and the excitement of sorting new product inventory every day. We offer competitive hourly wages and performance bonuses.",
  benefits: "We offer weekly pay, medical/dental benefits for full-time employees, paid time off, and an employee discount on auction items won!",
  catalogerPrep: "For the Product Cataloger & Grader role, we look for candidates with strong typing skills, accuracy in identifying item conditions, and the ability to spot missing parts. You can practice using our AI Interview Prep or take our Cataloging Challenge assessment!",
  warehousePrep: "For the Warehouse Processing Associate role, we value stamina, attention to safety (especially around forklifts), and accuracy with RF scanners. Feel free to launch the Practice Interview Simulator in your Candidate Dashboard."
};
