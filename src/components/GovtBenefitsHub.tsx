import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Landmark,
  GraduationCap,
  BookOpen,
  CreditCard,
  Search,
  CheckCircle2,
  Calculator,
  FileCheck2,
  Bookmark,
  ExternalLink,
  Copy,
  Check,
  Volume2,
  Bot,
  ChevronRight,
  SlidersHorizontal,
  X,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export type PortalCategory =
  | 'all'
  | 'nsp_scholarships'
  | 'credit_subsidy'
  | 'pmevidya_iitpal'
  | 'eabhyas_prep';

export interface GovtSchemeItem {
  id: string;
  title: string;
  authority: string;
  portalName: string;
  portalCategory: Exclude<PortalCategory, 'all'>;
  officialUrl: string;
  benefitSummary: string;
  annualValueINR: number; // 0 for free academic digital resources, >0 for direct financial grant/subsidy
  benefitType: 'Direct Grant (DBT)' | 'Interest Subsidy' | 'Academic Credit' | 'Free IIT/NTA Prep';
  deadlineText: string;
  statusLabel: 'Active Window' | 'Year-Round' | 'Closing Soon';
  incomeLimitLakhs: number | null; // null means no income ceiling
  minScorePercent: number;
  eligibleStreams: Array<'engineering' | 'medical' | 'undergrad_stem' | 'postgrad' | 'school_11_12'>;
  eligibleTags: Array<'all' | 'girl_student' | 'pwd' | 'sc_st_obc_ews'>;
  description: string;
  keyHighlights: string[];
  requiredDocuments: string[];
  applicationSteps: string[];
}

export const GOVT_SCHEMES_DATA: GovtSchemeItem[] = [
  // 1. NATIONAL SCHOLARSHIP PORTAL (NSP) HUB
  {
    id: 'nsp_csss',
    title: 'Central Sector Scheme of Scholarships (CSSS) for College & University Students',
    authority: 'Department of Higher Education, Ministry of Education',
    portalName: 'National Scholarship Portal (NSP)',
    portalCategory: 'nsp_scholarships',
    officialUrl: 'https://scholarships.gov.in',
    benefitSummary: '₹12,000 to ₹20,000 / year',
    annualValueINR: 20000,
    benefitType: 'Direct Grant (DBT)',
    deadlineText: '31 Oct 2026',
    statusLabel: 'Active Window',
    incomeLimitLakhs: 4.5,
    minScorePercent: 80,
    eligibleStreams: ['engineering', 'medical', 'undergrad_stem', 'postgrad'],
    eligibleTags: ['all'],
    description:
      'Provides direct financial support via Aadhaar-based Direct Benefit Transfer (DBT) to meritorious students from low-income families who are above the 80th percentile in Class XII board examinations pursuing regular degree courses.',
    keyHighlights: [
      '₹12,000/year for first 3 years of Graduation (B.Tech/B.Sc/B.A/B.Com)',
      '₹20,000/year for 4th/5th year of Integrated/B.Tech & Postgraduate studies',
      '82,000 fresh scholarships awarded annually across India (50% reserved for girls)',
      'Direct disbursement into Aadhaar-seeded bank account via NSP OTR',
    ],
    requiredDocuments: [
      'NSP One-Time Registration (OTR) ID & Face Auth completion',
      'Class 12th Marksheet (80th percentile verification)',
      'Family Income Certificate (≤ ₹4.5 Lakh/year via DigiLocker/Tehsildar)',
      'Bonafide Student Verification from AISHE-registered Institution',
    ],
    applicationSteps: [
      'Complete One-Time Registration (OTR) on scholarships.gov.in and finish Aadhaar e-KYC / Face Auth.',
      'Log in with your 14-digit OTR ID and select "Central Sector Scheme of Scholarships".',
      'Enter AISHE code of your college/university and upload Class 12 & Income certificates from DigiLocker.',
      'Submit form and get online Institute Nodal Officer (INO) Level-1 verification.',
    ],
  },
  {
    id: 'nsp_pragati',
    title: 'AICTE Pragati Scholarship Scheme for Girl Students (Technical Degree/Diploma)',
    authority: 'All India Council for Technical Education (AICTE)',
    portalName: 'National Scholarship Portal (NSP)',
    portalCategory: 'nsp_scholarships',
    officialUrl: 'https://scholarships.gov.in',
    benefitSummary: '₹50,000 / year',
    annualValueINR: 50000,
    benefitType: 'Direct Grant (DBT)',
    deadlineText: '31 Oct 2026',
    statusLabel: 'Active Window',
    incomeLimitLakhs: 8.0,
    minScorePercent: 60,
    eligibleStreams: ['engineering', 'undergrad_stem'],
    eligibleTags: ['girl_student'],
    description:
      'Empowering women in STEM & Technical Education ("Empowering Women through Technical Education"). Covers college tuition fee, purchase of laptops, books, equipment, and academic software for up to 2 girl children per family.',
    keyHighlights: [
      '₹50,000 per annum for every year of study (up to 4 years for first-year B.E./B.Tech admittees)',
      '10,000 scholarships per annum + 100% coverage for eligible girls from 13 NER/UT states',
      'Covers laptops, textbooks, hostel/tuition fees with no separate receipts required',
      'Family income ceiling up to ₹8.0 Lakh per annum',
    ],
    requiredDocuments: [
      'NSP OTR ID & Aadhaar-seeded Student Bank Account',
      'AICTE-approved Institution Admission Letter & Bonafide Certificate',
      'Annual Family Income Certificate (≤ ₹8.0 Lakh)',
      'Parents Declaration certifying max 2 girl children availing the scheme',
    ],
    applicationSteps: [
      'Register on NSP portal (scholarships.gov.in) under AICTE Schemes.',
      'Select "Pragati Scholarship Scheme for Girl Students (Technical Degree)".',
      'Link DigiLocker documents for 10th/12th marksheets and income proof.',
      'Submit for online verification by your Engineering College AICTE Nodal Officer.',
    ],
  },
  {
    id: 'nsp_inspire',
    title: 'DST INSPIRE Scholarship for Higher Education (SHE)',
    authority: 'Department of Science & Technology (DST), Govt. of India',
    portalName: 'NSP & Online INSPIRE Portal',
    portalCategory: 'nsp_scholarships',
    officialUrl: 'https://online-inspire.gov.in',
    benefitSummary: '₹80,000 / year',
    annualValueINR: 80000,
    benefitType: 'Direct Grant (DBT)',
    deadlineText: '15 Nov 2026',
    statusLabel: 'Active Window',
    incomeLimitLakhs: null,
    minScorePercent: 85,
    eligibleStreams: ['undergrad_stem', 'engineering', 'medical'],
    eligibleTags: ['all'],
    description:
      'Flagship fellowship for students in the top 1% of Class XII Boards or top 10,000 rankers in JEE Main / JEE Advanced / NEET who enroll in B.Sc., B.S., or Integrated M.Sc./M.S. in Basic & Natural Sciences.',
    keyHighlights: [
      '₹60,000/year annual cash scholarship + ₹20,000/year Summer Research Mentorship grant',
      'No family income ceiling — purely merit-based national scientific talent award',
      'Direct summer research attachment at IITs, IISc, IISERs, and CSIR laboratories',
      'Supported for up to 5 years (until completion of Masters/Integrated program)',
    ],
    requiredDocuments: [
      'Class XII Board Top 1% Advisory Note or JEE/NEET Rank Card (Top 10,000)',
      'Endorsement Certificate signed by Principal/Registrar of host University/IISER/IIT',
      'SBI Aadhaar-linked regular savings account details',
    ],
    applicationSteps: [
      'Create applicant profile on online-inspire.gov.in or NSP.',
      'Upload Class 12 Board eligibility note or JEE/NEET All-India Rank card.',
      'Upload Principal/Dean endorsement form for enrolled B.Sc./B.S./Int. M.Sc. program.',
      'Track annual renewal by maintaining ≥ 60% / 6.0 CGPA.',
    ],
  },
  {
    id: 'nsp_saksham',
    title: 'AICTE Saksham Scholarship for Specially-Abled Students',
    authority: 'All India Council for Technical Education (AICTE)',
    portalName: 'National Scholarship Portal (NSP)',
    portalCategory: 'nsp_scholarships',
    officialUrl: 'https://scholarships.gov.in',
    benefitSummary: '₹50,000 / year',
    annualValueINR: 50000,
    benefitType: 'Direct Grant (DBT)',
    deadlineText: '31 Oct 2026',
    statusLabel: 'Active Window',
    incomeLimitLakhs: 8.0,
    minScorePercent: 50,
    eligibleStreams: ['engineering', 'undergrad_stem', 'postgrad'],
    eligibleTags: ['pwd'],
    description:
      'Guaranteed financial grant for every eligible specially-abled student (≥ 40% disability) admitted to AICTE-approved technical degree or diploma institutions to purchase assistive devices, software, and cover tuition.',
    keyHighlights: [
      '₹50,000/year assured to 100% of qualifying specially-abled technical students (no quota cap)',
      'Supports Braille readers, screen-reading software, laptops, and college fees',
      'Income limit up to ₹8.0 Lakh per annum',
    ],
    requiredDocuments: [
      'UDID Card / Disability Certificate (≥ 40% benchmark disability)',
      'NSP OTR ID & Family Income Certificate (≤ ₹8.0 Lakh)',
      'AICTE Institution Admission Proof',
    ],
    applicationSteps: [
      'Log in to scholarships.gov.in with OTR ID and UDID number.',
      'Apply under AICTE Saksham Scheme and attach UDID disability certificate.',
      'Complete college nodal verification for direct ₹50,000 DBT payout.',
    ],
  },

  // 2. THE HIGHER EDUCATION CREDIT & SUBSIDY HUB
  {
    id: 'credit_pm_vidyalaxmi',
    title: 'PM-Vidyalaxmi Scheme: Collateral-Free Loan & 3% Interest Subvention',
    authority: 'Department of Higher Education, Ministry of Education',
    portalName: 'Higher Education Credit & Subsidy Hub',
    portalCategory: 'credit_subsidy',
    officialUrl: 'https://pmvidyalaxmi.co.in',
    benefitSummary: '3% Subsidy up to ₹10L Loan',
    annualValueINR: 30000,
    benefitType: 'Interest Subsidy',
    deadlineText: 'Year-Round Digital Window',
    statusLabel: 'Year-Round',
    incomeLimitLakhs: 8.0,
    minScorePercent: 50,
    eligibleStreams: ['engineering', 'medical', 'undergrad_stem', 'postgrad'],
    eligibleTags: ['all'],
    description:
      'Unified digital portal providing collateral-free, guarantor-free education loans for students admitted to India’s top 860 Quality Higher Educational Institutions (QHEIs / NIRF-ranked), with 3% interest subvention on loans up to ₹10 Lakhs.',
    keyHighlights: [
      'Zero collateral and zero third-party guarantor required across all scheduled banks',
      '3% Government Interest Subvention on loans up to ₹10 Lakhs for income ≤ ₹8.0 Lakh/yr',
      '75% Credit Guarantee by Govt. of India on loan defaults up to ₹7.5 Lakhs',
      'Digital e-Voucher disbursement of interest subsidy directly to student loan account',
    ],
    requiredDocuments: [
      'Admission Offer Letter from NIRF/QHEI listed Institution (IITs, NITs, AIIMS, IIITs, Central/State Univs)',
      'Aadhaar Card, PAN Card & Family Income Proof (≤ ₹8.0 Lakh for 3% subvention)',
      'Academic Fee Structure breakdown from Institution',
    ],
    applicationSteps: [
      'Visit pmvidyalaxmi.co.in and complete the Common Education Loan Application Form (CELAF).',
      'Select up to 3 preferred public/private sector banks with a single 2-page digital application.',
      'Track loan sanction status online and claim annual 3% interest subvention e-Voucher.',
    ],
  },
  {
    id: 'credit_csis_jansamarth',
    title: 'Central Sector Interest Subsidy (CSIS) — 100% Moratorium Interest Waiver',
    authority: 'Ministry of Education · JanSamarth National Portal',
    portalName: 'Higher Education Credit & Subsidy Hub',
    portalCategory: 'credit_subsidy',
    officialUrl: 'https://www.jansamarth.in',
    benefitSummary: '100% Moratorium Interest Free',
    annualValueINR: 85000,
    benefitType: 'Interest Subsidy',
    deadlineText: 'Year-Round Digital Window',
    statusLabel: 'Year-Round',
    incomeLimitLakhs: 4.5,
    minScorePercent: 50,
    eligibleStreams: ['engineering', 'medical', 'undergrad_stem', 'postgrad'],
    eligibleTags: ['all', 'sc_st_obc_ews'],
    description:
      'Government of India pays 100% of the interest accrued on education loans up to ₹10 Lakhs during the entire course duration plus 1 year moratorium period for students from families with annual income up to ₹4.5 Lakhs.',
    keyHighlights: [
      'Zero interest burden during 4-year B.Tech/MBBS + 1 year post-graduation moratorium (5 years total)',
      'Saves ₹2.2 Lakh to ₹4.0 Lakh in compound interest before EMI repayment even begins',
      'Instant eligibility check and digital lender matching via JanSamarth & PM-Vidyalaxmi',
    ],
    requiredDocuments: [
      'EWS / Annual Family Income Certificate (≤ ₹4.5 Lakh/year)',
      'Admission proof in Technical/Professional course approved by AICTE/UGC/NMC',
      'Aadhaar & Student KYC on JanSamarth / PM-Vidyalaxmi portal',
    ],
    applicationSteps: [
      'Run the Subsidy Eligibility Check on jansamarth.in or pmvidyalaxmi.co.in.',
      'Submit income certificate to your lending bank branch or digitally via JanSamarth.',
      'Full moratorium interest is credited directly by Canara Bank (Nodal Bank) / MoE.',
    ],
  },
  {
    id: 'credit_abc_apaar',
    title: 'Academic Bank of Credits (ABC) & APAAR ID Credit Mobility Hub',
    authority: 'UGC & Ministry of Education (NEP 2020)',
    portalName: 'Higher Education Credit & Subsidy Hub',
    portalCategory: 'credit_subsidy',
    officialUrl: 'https://www.abc.gov.in',
    benefitSummary: 'Up to 40% Credit Transfer',
    annualValueINR: 0,
    benefitType: 'Academic Credit',
    deadlineText: 'Mandatory for All Univs',
    statusLabel: 'Year-Round',
    incomeLimitLakhs: null,
    minScorePercent: 0,
    eligibleStreams: ['engineering', 'medical', 'undergrad_stem', 'postgrad', 'school_11_12'],
    eligibleTags: ['all'],
    description:
      'Official National Academic Depository storehouse ("One Nation, One Student ID") enabling students to earn up to 40% of their degree credits from SWAYAM/NPTEL/IIT courses and transfer them seamlessly into their university transcript.',
    keyHighlights: [
      'Generates lifetime 12-digit APAAR / ABC ID linked to DigiLocker',
      'Earn credits from IIT NPTEL courses and count them directly toward your B.Tech/B.Sc CGPA',
      'Supports Multiple Entry & Multiple Exit (Certificate, Diploma, Degree, Honours with Research)',
    ],
    requiredDocuments: [
      'Aadhaar number linked with mobile OTP',
      'DigiLocker account & University/College Roll Number',
    ],
    applicationSteps: [
      'Sign in to abc.gov.in or DigiLocker app using your Aadhaar-linked mobile number.',
      'Select your University/Institute name and admission year to generate your 12-digit ABC ID.',
      'Provide your ABC ID when registering for university exams or SWAYAM/NPTEL credit courses.',
    ],
  },

  // 3. PM E-VIDYA & IIT PAL HUB
  {
    id: 'iit_pal_hub',
    title: 'IIT PAL (Professor Assisted Learning) for JEE Main, Advanced & NEET',
    authority: 'IIT Delhi & National Coordinator IITs · Ministry of Education',
    portalName: 'IIT PAL & SWAYAM Prabha',
    portalCategory: 'pmevidya_iitpal',
    officialUrl: 'https://iitpal.iitd.ac.in',
    benefitSummary: '100% Free IIT Faculty Coaching',
    annualValueINR: 0,
    benefitType: 'Free IIT/NTA Prep',
    deadlineText: 'Open 24×7 Access',
    statusLabel: 'Year-Round',
    incomeLimitLakhs: null,
    minScorePercent: 0,
    eligibleStreams: ['engineering', 'medical', 'school_11_12', 'undergrad_stem'],
    eligibleTags: ['all'],
    description:
      'Designed and taught directly by senior IIT Professors to eliminate dependence on costly commercial coaching. Offers 600+ hours of conceptual Physics, Chemistry, Mathematics, and Biology lectures plus live interactive mentorship.',
    keyHighlights: [
      'Full Class 11 & 12 PCMB syllabus mapped to JEE Advanced & NEET conceptual depth',
      'Broadcast 24×7 on SWAYAM Prabha DTH Channels 19, 20, 21 & 22 and on iitpal.iitd.ac.in',
      'Submit tough conceptual questions online for direct video solutions & live webinars by IIT faculty',
      'Available in English and regional Indian languages via DIKSHA integration',
    ],
    requiredDocuments: [
      'No fee or income certificate required — open to all Indian students',
      'Optional free student registration on iitpal.iitd.ac.in for live doubt sessions',
    ],
    applicationSteps: [
      'Visit iitpal.iitd.ac.in or tune in to SWAYAM Prabha Channels 19–22 (Physics, Chemistry, Maths, Biology).',
      'Browse topic-wise IIT Professor lecture series and solved numerical problem banks.',
      'Register in the Student Corner to book live interactive mentoring sessions with IIT faculty.',
    ],
  },
  {
    id: 'pmevidya_diksha',
    title: 'PM e-Vidya & DIKSHA "One Nation, One Digital Platform"',
    authority: 'NCERT & Ministry of Education, Govt. of India',
    portalName: 'PM e-Vidya Hub',
    portalCategory: 'pmevidya_iitpal',
    officialUrl: 'https://pmevidya.education.gov.in',
    benefitSummary: '200+ Channels & Energized e-Books',
    annualValueINR: 0,
    benefitType: 'Free IIT/NTA Prep',
    deadlineText: 'Open 24×7 Access',
    statusLabel: 'Year-Round',
    incomeLimitLakhs: null,
    minScorePercent: 0,
    eligibleStreams: ['school_11_12', 'engineering', 'medical', 'undergrad_stem'],
    eligibleTags: ['all', 'pwd'],
    description:
      'Comprehensive multi-mode digital education initiative uniting DIKSHA QR-coded interactive textbooks, 200 PM e-Vidya DTH TV channels in 29 languages, DAISY/ISL content for CwSN learners, and Manodarpan mental health support.',
    keyHighlights: [
      'Interactive chapter-wise question banks & virtual labs synced with NCERT Class 6–12 & competitive exams',
      'Dedicated Indian Sign Language (ISL) and Talking Books (DAISY) for differently-abled students',
      '24×7 toll-free Manodarpan exam stress helpline (8448440632) by trained psychologists',
    ],
    requiredDocuments: ['Open access — no documents required'],
    applicationSteps: [
      'Access pmevidya.education.gov.in or diksha.gov.in from web or mobile.',
      'Select your Board (CBSE/State), Medium, and Target Exam (JEE/NEET/NCERT Foundation).',
      'Scan QR codes in physical textbooks or stream interactive simulations directly.',
    ],
  },

  // 4. E-ABHYAS (NTA) & AUTHORIZED FREE LEARNING HUB
  {
    id: 'nta_eabhyas',
    title: 'NTA National Test Abhyas (e-Abhyas) Official AI Mock Exam Suite',
    authority: 'National Testing Agency (NTA), Ministry of Education',
    portalName: 'e-Abhyas (NTA Abhyas)',
    portalCategory: 'eabhyas_prep',
    officialUrl: 'https://www.nta.ac.in/abhyas',
    benefitSummary: '100+ Official NTA Mock Tests',
    annualValueINR: 0,
    benefitType: 'Free IIT/NTA Prep',
    deadlineText: 'Daily Test Releases',
    statusLabel: 'Year-Round',
    incomeLimitLakhs: null,
    minScorePercent: 0,
    eligibleStreams: ['engineering', 'medical', 'school_11_12'],
    eligibleTags: ['all'],
    description:
      'Official computer-based test (CBT) simulator built by the National Testing Agency (NTA). Delivers authentic JEE Main and NEET full-length tests with question-level behavioral telemetry, careless mistake detection, and step-by-step solutions.',
    keyHighlights: [
      'Exact NTA exam interface replica with virtual scientific calculator & palette states',
      'Granular time-per-question analysis: "Too Fast (Guess)", "Ideal", or "Overtime Trap"',
      'Works offline after downloading test paper — ideal for low-bandwidth regions',
      'Bilingual test papers (English & Hindi) curated by NTA subject matter experts',
    ],
    requiredDocuments: ['Free Student Sign-up with Email or Mobile Number'],
    applicationSteps: [
      'Access nta.ac.in/abhyas and select JEE Main or NEET target stream.',
      'Download a full 3-hour CBT mock test or chapter-wise micro-test.',
      'Review post-test NTA diagnostic analytics and sync weak concepts with MasteryFlow.',
    ],
  },
  {
    id: 'swayam_nptel',
    title: 'SWAYAM & NPTEL IIT Certification + 50% Exam Fee Scholarship',
    authority: 'IIT Madras & 7 IITs / IISc · Ministry of Education',
    portalName: 'SWAYAM / NPTEL Hub',
    portalCategory: 'eabhyas_prep',
    officialUrl: 'https://swayam.gov.in',
    benefitSummary: 'Free IIT Courses + Fee Waiver',
    annualValueINR: 4000,
    benefitType: 'Academic Credit',
    deadlineText: '15 Nov 2026 (Sem Enrollment)',
    statusLabel: 'Active Window',
    incomeLimitLakhs: null,
    minScorePercent: 0,
    eligibleStreams: ['engineering', 'undergrad_stem', 'postgrad'],
    eligibleTags: ['all', 'sc_st_obc_ews', 'pwd'],
    description:
      'India’s national MOOC platform offering 2,500+ semester courses taught by IIT and IISc faculty. Learning is 100% free, with proctored exam fee waivers (50% off for SC/ST/PwD and CSR-funded 100% fee support via NPTEL Local Chapters).',
    keyHighlights: [
      'Direct GATE CS, Data Science, AI, and Core Engineering courses by IIT Professors',
      'Earn 2 to 4 UGC-approved university credits transferable directly to your ABC ID',
      'NPTEL Stars & CSR scholarship covers proctored certification fees for low-income learners',
    ],
    requiredDocuments: [
      'APAAR / ABC ID for university credit transfer',
      'College ID & SC/ST/PwD/EWS certificate (if claiming 50%–100% exam fee waiver)',
    ],
    applicationSteps: [
      'Log in to swayam.gov.in or onlinecourses.nptel.ac.in.',
      'Enroll in semester courses for free and link your 12-digit ABC ID.',
      'Apply through your college NPTEL Local Chapter SPOC for CSR exam fee waiver.',
    ],
  },
  {
    id: 'ndli_iitkgp',
    title: 'National Digital Library of India (NDLI) — 10 Crore+ Academic Repository',
    authority: 'IIT Kharagpur · NMEICT, Ministry of Education',
    portalName: 'NDLI Hub (IIT Kharagpur)',
    portalCategory: 'eabhyas_prep',
    officialUrl: 'https://ndl.iitkgp.ac.in',
    benefitSummary: 'Free 10Cr+ Books & Past Papers',
    annualValueINR: 0,
    benefitType: 'Free IIT/NTA Prep',
    deadlineText: 'Open 24×7 Access',
    statusLabel: 'Year-Round',
    incomeLimitLakhs: null,
    minScorePercent: 0,
    eligibleStreams: ['engineering', 'medical', 'undergrad_stem', 'postgrad', 'school_11_12'],
    eligibleTags: ['all'],
    description:
      'National digital knowledge repository developed by IIT Kharagpur providing single-window access to 100+ million textbooks, IEEE/Springer reference guides, solved JEE/GATE/UPSC archives, and video lectures.',
    keyHighlights: [
      'Complete archive of solved JEE Advanced, GATE, JAM, and UPSC Civil Services papers',
      'Free institutional access to international journals, theses (Shodhganga), and NCERT/State books',
      'NDLI Club certification & national academic competitions for registered students',
    ],
    requiredDocuments: ['Open access with free email registration'],
    applicationSteps: [
      'Visit ndl.iitkgp.ac.in and select your Educational Level (School, UG Engineering, GATE/JEE Prep).',
      'Filter by Resource Type (Video Lectures, Solved Question Papers, Textbooks).',
    ],
  },
];

interface ReadinessItem {
  id: string;
  title: string;
  portal: string;
  url: string;
  timeEstimate: string;
  instructions: string;
}

const READINESS_CHECKLIST: ReadinessItem[] = [
  {
    id: 'chk_nsp_otr',
    title: 'NSP One-Time Registration (OTR) & Aadhaar Face Auth',
    portal: 'scholarships.gov.in',
    url: 'https://scholarships.gov.in',
    timeEstimate: '5 mins',
    instructions:
      'Generate your lifetime 14-digit OTR ID on NSP and complete biometric face authentication via the NSP OTR + AadhaarFaceRD app.',
  },
  {
    id: 'chk_npci_dbt',
    title: 'Aadhaar-Seeded Bank Account (NPCI DBT Mapper Active)',
    portal: 'myaadhaar.uidai.gov.in',
    url: 'https://myaadhaar.uidai.gov.in',
    timeEstimate: '2 mins',
    instructions:
      'Verify on myAadhaar Bank Seeding Status that your savings account is mapped as "Active" on the NPCI Direct Benefit Transfer (DBT) mapper.',
  },
  {
    id: 'chk_abc_apaar',
    title: '12-Digit APAAR / Academic Bank of Credits (ABC) ID',
    portal: 'abc.gov.in',
    url: 'https://www.abc.gov.in',
    timeEstimate: '3 mins',
    instructions:
      'Mandatory under NEP 2020 for university exams, SWAYAM credit transfers, and scholarship renewals. Generate instantly via DigiLocker.',
  },
  {
    id: 'chk_digilocker_income',
    title: 'DigiLocker Verified Income & Class 12th Marksheet',
    portal: 'digilocker.gov.in',
    url: 'https://www.digilocker.gov.in',
    timeEstimate: '4 mins',
    instructions:
      'Pull your State Revenue Department Income Certificate and CBSE/State Class 12th Marksheet into DigiLocker for zero-upload verification on NSP & PM-Vidyalaxmi.',
  },
];

interface GovtBenefitsHubProps {
  compact?: boolean;
}

export const GovtBenefitsHub: React.FC<GovtBenefitsHubProps> = ({ compact = false }) => {
  const { speakText, setIsGlobalChatOpen, setActiveView } = useApp();

  // Filter & Search State
  const [activeCategory, setActiveCategory] = useState<PortalCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Interactive Tool Tabs: 'matcher' | 'calculator' | 'readiness' | null
  const [activeTool, setActiveTool] = useState<'matcher' | 'calculator' | 'readiness' | null>(
    compact ? null : 'matcher'
  );

  // Personalized Eligibility Matcher State
  const [eligibilityFilterActive, setEligibilityFilterActive] = useState(false);
  const [studentStream, setStudentStream] = useState<
    'engineering' | 'medical' | 'undergrad_stem' | 'postgrad' | 'school_11_12'
  >('engineering');
  const [familyIncomeLakhs, setFamilyIncomeLakhs] = useState<number>(3.8);
  const [boardScorePercent, setBoardScorePercent] = useState<number>(84);
  const [studentCategoryTag, setStudentCategoryTag] = useState<
    'all' | 'girl_student' | 'pwd' | 'sc_st_obc_ews'
  >('all');

  // Higher Education Credit & Subsidy Calculator State (PM-Vidyalaxmi + CSIS)
  const [loanAmountLakhs, setLoanAmountLakhs] = useState<number>(7.5);
  const [courseDurationYears, setCourseDurationYears] = useState<number>(4);
  const [bankInterestRate, setBankInterestRate] = useState<number>(8.5);

  // Saved / Bookmarked Schemes & Readiness Checklist State
  const [savedSchemeIds, setSavedSchemeIds] = useState<string[]>([
    'nsp_csss',
    'credit_pm_vidyalaxmi',
    'iit_pal_hub',
  ]);
  const [completedChecklistIds, setCompletedChecklistIds] = useState<string[]>([
    'chk_nsp_otr',
    'chk_npci_dbt',
  ]);

  // Modal & Clipboard Feedback
  const [selectedScheme, setSelectedScheme] = useState<GovtSchemeItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleSaveScheme = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedSchemeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleChecklist = (id: string) => {
    setCompletedChecklistIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyUrl = (url: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  // Check if a scheme matches the student's eligibility parameters
  const checkSchemeEligibility = (scheme: GovtSchemeItem): boolean => {
    const streamOk = scheme.eligibleStreams.includes(studentStream);
    const incomeOk =
      scheme.incomeLimitLakhs === null || familyIncomeLakhs <= scheme.incomeLimitLakhs;
    const scoreOk = boardScorePercent >= scheme.minScorePercent;
    const tagOk =
      scheme.eligibleTags.includes('all') || scheme.eligibleTags.includes(studentCategoryTag);
    return streamOk && incomeOk && scoreOk && tagOk;
  };

  // Filtered Schemes
  const filteredSchemes = useMemo(() => {
    return GOVT_SCHEMES_DATA.filter((scheme) => {
      if (activeCategory !== 'all' && scheme.portalCategory !== activeCategory) return false;
      if (showSavedOnly && !savedSchemeIds.includes(scheme.id)) return false;
      if (eligibilityFilterActive && !checkSchemeEligibility(scheme)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          scheme.title.toLowerCase().includes(q) ||
          scheme.portalName.toLowerCase().includes(q) ||
          scheme.authority.toLowerCase().includes(q) ||
          scheme.description.toLowerCase().includes(q) ||
          scheme.benefitSummary.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    activeCategory,
    showSavedOnly,
    savedSchemeIds,
    eligibilityFilterActive,
    studentStream,
    familyIncomeLakhs,
    boardScorePercent,
    studentCategoryTag,
    searchQuery,
  ]);

  // Calculate total matched annual financial benefits
  const eligibleStats = useMemo(() => {
    const matching = GOVT_SCHEMES_DATA.filter((s) => checkSchemeEligibility(s));
    const totalAnnualGrant = matching.reduce((sum, s) => sum + s.annualValueINR, 0);
    return {
      count: matching.length,
      totalAnnualGrant,
    };
  }, [studentStream, familyIncomeLakhs, boardScorePercent, studentCategoryTag]);

  // Calculate Education Loan Subsidy (PM-Vidyalaxmi + CSIS)
  const loanCalculation = useMemo(() => {
    const principal = loanAmountLakhs * 100000;
    const moratoriumYears = courseDurationYears + 1; // Course + 1 yr moratorium
    const eligiblePrincipalForSubsidy = Math.min(principal, 1000000); // Subsidized up to ₹10L

    // Standard unsubsidized simple interest during moratorium (average disbursement factor ~0.65 during study + full in moratorium year)
    const rawMoratoriumInterest = Math.round(
      principal * (bankInterestRate / 100) * (courseDurationYears * 0.65 + 1)
    );

    let subsidySchemeName = 'Standard PM-Vidyalaxmi Collateral-Free Rate';
    let govtSubsidyAmount = 0;
    let effectiveRateDuringMoratorium = bankInterestRate;

    if (familyIncomeLakhs <= 4.5) {
      // CSIS: 100% Interest Subsidy during course + 1 year moratorium up to ₹10L
      subsidySchemeName = 'CSIS (100% Moratorium Interest Waiver ≤ ₹4.5L Income)';
      const ratio = eligiblePrincipalForSubsidy / principal;
      govtSubsidyAmount = Math.round(rawMoratoriumInterest * ratio);
      effectiveRateDuringMoratorium = Number((bankInterestRate * (1 - ratio)).toFixed(2));
    } else if (familyIncomeLakhs <= 8.0) {
      // PM-Vidyalaxmi: 3% Interest Subvention up to ₹10L
      subsidySchemeName = 'PM-Vidyalaxmi 3% Interest Subvention (≤ ₹8.0L Income)';
      const ratio = eligiblePrincipalForSubsidy / principal;
      const subventionShare = (3.0 / bankInterestRate) * ratio;
      govtSubsidyAmount = Math.round(rawMoratoriumInterest * subventionShare);
      effectiveRateDuringMoratorium = Number(
        Math.max(0, bankInterestRate - 3.0 * ratio).toFixed(2)
      );
    }

    const netStudentMoratoriumInterest = Math.max(0, rawMoratoriumInterest - govtSubsidyAmount);

    // 10-year (120 months) EMI after moratorium
    const rMonthly = bankInterestRate / 12 / 100;
    const nMonths = 120;
    const unsubsidizedRepayPrincipal = principal + rawMoratoriumInterest;
    const subsidizedRepayPrincipal = principal + netStudentMoratoriumInterest;

    const calcEmi = (p: number) =>
      Math.round(
        (p * rMonthly * Math.pow(1 + rMonthly, nMonths)) / (Math.pow(1 + rMonthly, nMonths) - 1)
      );

    return {
      principal,
      moratoriumYears,
      rawMoratoriumInterest,
      govtSubsidyAmount,
      netStudentMoratoriumInterest,
      subsidySchemeName,
      effectiveRateDuringMoratorium,
      standardEmi: calcEmi(unsubsidizedRepayPrincipal),
      subsidizedEmi: calcEmi(subsidizedRepayPrincipal),
    };
  }, [loanAmountLakhs, courseDurationYears, bankInterestRate, familyIncomeLakhs]);

  const portalCountByCategory = {
    all: GOVT_SCHEMES_DATA.length,
    nsp_scholarships: GOVT_SCHEMES_DATA.filter((s) => s.portalCategory === 'nsp_scholarships')
      .length,
    credit_subsidy: GOVT_SCHEMES_DATA.filter((s) => s.portalCategory === 'credit_subsidy').length,
    pmevidya_iitpal: GOVT_SCHEMES_DATA.filter((s) => s.portalCategory === 'pmevidya_iitpal').length,
    eabhyas_prep: GOVT_SCHEMES_DATA.filter((s) => s.portalCategory === 'eabhyas_prep').length,
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-6">
      {/* 1. Header & Authorized Portals Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Landmark className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>Ministry of Education & AICTE Authorized Aggregator</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">AY 2026–27</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Government Benefits, Scholarships & Digital Learning Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            Unified access to the <strong className="font-semibold text-slate-800">National Scholarship Portal (NSP)</strong>,{' '}
            <strong className="font-semibold text-slate-800">Higher Education Credit & Subsidy Hub (PM-Vidyalaxmi & CSIS)</strong>,{' '}
            <strong className="font-semibold text-slate-800">PM e-Vidya</strong>,{' '}
            <strong className="font-semibold text-slate-800">IIT PAL</strong>, and{' '}
            <strong className="font-semibold text-slate-800">NTA e-Abhyas</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {compact && (
            <button
              onClick={() => setActiveView('student_govt_benefits')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Open Full Benefits Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() =>
              speakText(
                `Government Benefits and Scholarships Hub. You currently match ${eligibleStats.count} verified central schemes worth up to ${eligibleStats.totalAnnualGrant.toLocaleString('en-IN')} rupees per year in direct grants and interest subsidies, plus free IIT PAL and NTA e-Abhyas coaching.`
              )
            }
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Read aloud summary"
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Listen Summary</span>
          </button>
        </div>
      </div>

      {/* 2. Four Authorized Pillar Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() =>
            setActiveCategory(activeCategory === 'nsp_scholarships' ? 'all' : 'nsp_scholarships')
          }
          className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
            activeCategory === 'nsp_scholarships'
              ? 'bg-blue-50/70 border-blue-300'
              : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>scholarships.gov.in</span>
            <GraduationCap className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-sm font-bold text-slate-900">National Scholarship Portal (NSP)</div>
          <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
            ₹12,000 – ₹80,000/yr · Direct DBT
          </div>
        </button>

        <button
          onClick={() =>
            setActiveCategory(activeCategory === 'credit_subsidy' ? 'all' : 'credit_subsidy')
          }
          className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
            activeCategory === 'credit_subsidy'
              ? 'bg-emerald-50/70 border-emerald-300'
              : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>pmvidyalaxmi.co.in · abc.gov.in</span>
            <CreditCard className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-sm font-bold text-slate-900">Higher Ed Credit & Subsidy Hub</div>
          <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
            Up to ₹10L Loan · 3%–100% Subsidy
          </div>
        </button>

        <button
          onClick={() =>
            setActiveCategory(activeCategory === 'pmevidya_iitpal' ? 'all' : 'pmevidya_iitpal')
          }
          className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
            activeCategory === 'pmevidya_iitpal'
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>iitpal.iitd.ac.in · pmevidya</span>
            <BookOpen className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-sm font-bold text-slate-900">PM e-Vidya & IIT PAL Hub</div>
          <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
            600+ Hrs IIT Lectures · 200 DTH Ch.
          </div>
        </button>

        <button
          onClick={() =>
            setActiveCategory(activeCategory === 'eabhyas_prep' ? 'all' : 'eabhyas_prep')
          }
          className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
            activeCategory === 'eabhyas_prep'
              ? 'bg-indigo-50/70 border-indigo-300'
              : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>nta.ac.in/abhyas · swayam.gov.in</span>
            <Sparkles className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-sm font-bold text-slate-900">NTA e-Abhyas, SWAYAM & NDLI</div>
          <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
            Daily CBT Mocks · 40% Credit Transfer
          </div>
        </button>
      </div>

      {/* 3. Interactive Student Benefit Power-Tools Bar */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="text-xs font-bold text-slate-900">
              Interactive Student Benefit Tools:
            </span>
            <span className="text-xs text-slate-500 hidden md:inline">
              Check your exact eligibility, calculate loan interest waivers, or verify OTR readiness
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTool(activeTool === 'matcher' ? null : 'matcher')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTool === 'matcher'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1. Eligibility Matcher ({eligibleStats.count} Matched)</span>
            </button>

            <button
              onClick={() => setActiveTool(activeTool === 'calculator' ? null : 'calculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTool === 'calculator'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>2. Loan & Subsidy Calculator</span>
            </button>

            <button
              onClick={() => setActiveTool(activeTool === 'readiness' ? null : 'readiness')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTool === 'readiness'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>
                3. OTR & Document Vault ({completedChecklistIds.length}/{READINESS_CHECKLIST.length})
              </span>
            </button>
          </div>
        </div>

        {/* TOOL 1: PERSONALIZED ELIGIBILITY & BENEFIT MATCHER */}
        {activeTool === 'matcher' && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Personalized Scholarship & Scheme Eligibility Matcher
                </h3>
                <p className="text-xs text-slate-500">
                  Adjust your academic stream, annual family income, and Class 12 / CGPA score to filter qualifying schemes
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">
                    Est. Annual Direct Grant + Subsidy
                  </span>
                  <span className="text-base font-bold text-emerald-700 font-mono tabular-nums">
                    Up to ₹{eligibleStats.totalAnnualGrant.toLocaleString('en-IN')}/yr
                  </span>
                </div>
                <button
                  onClick={() => setEligibilityFilterActive(!eligibilityFilterActive)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    eligibilityFilterActive
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {eligibilityFilterActive
                    ? 'Showing Only Eligible Schemes ✓'
                    : 'Filter Grid by My Eligibility'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Academic Stream */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Academic Stream / Target
                </label>
                <select
                  value={studentStream}
                  onChange={(e) => setStudentStream(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="engineering">B.E. / B.Tech / JEE Engineering</option>
                  <option value="medical">MBBS / Medical / NEET</option>
                  <option value="undergrad_stem">B.Sc. / BS / Integrated M.Sc. STEM</option>
                  <option value="postgrad">M.Tech / M.Sc. / GATE Postgraduate</option>
                  <option value="school_11_12">Class 11 & 12 Foundation (NCERT)</option>
                </select>
              </div>

              {/* Annual Family Income Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700">Annual Family Income</label>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    ₹{familyIncomeLakhs.toFixed(1)} Lakhs/yr
                  </span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={12.0}
                  step={0.5}
                  value={familyIncomeLakhs}
                  onChange={(e) => setFamilyIncomeLakhs(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono tabular-nums">
                  <span>₹1.0L</span>
                  <span>≤₹4.5L (CSIS/CSSS)</span>
                  <span>≤₹8.0L (Pragati/PMVL)</span>
                  <span>₹12L+</span>
                </div>
              </div>

              {/* Class 12 / CGPA Score Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700">Class 12 / Current Score</label>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {boardScorePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={99}
                  step={1}
                  value={boardScorePercent}
                  onChange={(e) => setBoardScorePercent(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono tabular-nums">
                  <span>50%</span>
                  <span>60% (AICTE)</span>
                  <span>80%+ (CSSS)</span>
                  <span>99%</span>
                </div>
              </div>

              {/* Student Special Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Applicant Category
                </label>
                <select
                  value={studentCategoryTag}
                  onChange={(e) => setStudentCategoryTag(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="all">General / All Categories</option>
                  <option value="girl_student">Girl Student (Unlocks AICTE Pragati)</option>
                  <option value="sc_st_obc_ews">SC / ST / OBC / EWS Category</option>
                  <option value="pwd">Specially-Abled / PwD (Unlocks Saksham)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TOOL 2: HIGHER EDUCATION CREDIT & SUBSIDY CALCULATOR (PM-VIDYALAXMI + CSIS) */}
        {activeTool === 'calculator' && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Higher Education Credit & Interest Subsidy Simulator (PM-Vidyalaxmi + CSIS)
                </h3>
                <p className="text-xs text-slate-500">
                  Calculate exact Government of India interest waivers during your study period + 1-year moratorium
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-800">
                Active Rule: {loanCalculation.subsidySchemeName}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Sliders Column */}
              <div className="space-y-3 lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Loan Amount */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">Education Loan</span>
                      <span className="font-bold text-slate-900 font-mono tabular-nums">
                        ₹{loanAmountLakhs.toFixed(1)} Lakhs
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={20.0}
                      step={0.5}
                      value={loanAmountLakhs}
                      onChange={(e) => setLoanAmountLakhs(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
                      Up to ₹10L covered for subvention
                    </span>
                  </div>

                  {/* Family Income */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">Family Income</span>
                      <span className="font-bold text-slate-900 font-mono tabular-nums">
                        ₹{familyIncomeLakhs.toFixed(1)} Lakhs/yr
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={12.0}
                      step={0.5}
                      value={familyIncomeLakhs}
                      onChange={(e) => setFamilyIncomeLakhs(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
                      ≤₹4.5L: 100% Free · ≤₹8L: 3% Off
                    </span>
                  </div>

                  {/* Course Duration */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">Course Duration</span>
                      <span className="font-bold text-slate-900 font-mono tabular-nums">
                        {courseDurationYears} Yrs (+1 Yr Moratorium)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={5}
                      step={1}
                      value={courseDurationYears}
                      onChange={(e) => setCourseDurationYears(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
                      Bank Base Rate: {bankInterestRate}% p.a.
                    </span>
                  </div>
                </div>

                {/* Breakdown Bar */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 block">
                      Total Moratorium Interest ({loanCalculation.moratoriumYears} Yrs)
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-800 font-mono tabular-nums">
                      ₹{loanCalculation.rawMoratoriumInterest.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[11px] text-emerald-800 font-medium block">
                      Govt. Subsidy Paid via e-Voucher
                    </span>
                    <span className="text-sm sm:text-base font-bold text-emerald-700 font-mono tabular-nums">
                      - ₹{loanCalculation.govtSubsidyAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                    <span className="text-[11px] text-blue-800 font-medium block">
                      Monthly EMI (After Subsidy)
                    </span>
                    <span className="text-sm sm:text-base font-bold text-blue-900 font-mono tabular-nums">
                      ₹{loanCalculation.subsidizedEmi.toLocaleString('en-IN')}/mo
                    </span>
                    {loanCalculation.govtSubsidyAmount > 0 && (
                      <span className="text-[10px] text-slate-500 line-through block font-mono tabular-nums">
                        ₹{loanCalculation.standardEmi.toLocaleString('en-IN')}/mo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Callout Summary Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    Total Government Savings
                  </span>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-white">
                    ₹{loanCalculation.govtSubsidyAmount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {familyIncomeLakhs <= 4.5
                      ? 'You qualify for 100% Central Sector Interest Subsidy (CSIS) during study + 1 year moratorium up to ₹10L.'
                      : familyIncomeLakhs <= 8.0
                      ? 'You qualify for PM-Vidyalaxmi 3% interest subvention e-Vouchers + zero-collateral bank guarantee.'
                      : 'You qualify for collateral-free, guarantor-free QHEI education loans under PM-Vidyalaxmi.'}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-mono">pmvidyalaxmi.co.in</span>
                  <a
                    href="https://pmvidyalaxmi.co.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <span>Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TOOL 3: OTR & DOCUMENT VAULT READINESS CHECKLIST */}
        {activeTool === 'readiness' && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Mandatory Scholarship & Credit Readiness Checklist
                </h3>
                <p className="text-xs text-slate-500">
                  Complete these 4 digital prerequisites once to unlock 1-click applications across NSP, PM-Vidyalaxmi & SWAYAM
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums font-bold text-blue-700">
                Readiness:{' '}
                {Math.round((completedChecklistIds.length / READINESS_CHECKLIST.length) * 100)}%
                Complete
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {READINESS_CHECKLIST.map((item) => {
                const isDone = completedChecklistIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklist(item.id)}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                      isDone
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold ${
                            isDone ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                          {item.timeEstimate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.instructions}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                        <span className="font-mono">{item.portal}</span>
                        <span aria-hidden="true">·</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline font-medium inline-flex items-center gap-0.5"
                        >
                          <span>Verify Online</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Clean Interactive Segmented Filter Bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: `All Portals (${portalCountByCategory.all})` },
            { id: 'nsp_scholarships', label: `NSP Hub (${portalCountByCategory.nsp_scholarships})` },
            {
              id: 'credit_subsidy',
              label: `Credit & Subsidy (${portalCountByCategory.credit_subsidy})`,
            },
            {
              id: 'pmevidya_iitpal',
              label: `PM e-Vidya & IIT PAL (${portalCountByCategory.pmevidya_iitpal})`,
            },
            {
              id: 'eabhyas_prep',
              label: `e-Abhyas & SWAYAM (${portalCountByCategory.eabhyas_prep})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as PortalCategory)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Saved Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NSP, IIT PAL, Vidyalaxmi..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              showSavedOnly
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-blue-600 text-blue-600' : ''}`} />
            <span>Saved ({savedSchemeIds.length})</span>
          </button>
        </div>
      </div>

      {/* 5. Responsive Schemes Grid */}
      {filteredSchemes.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            No government schemes match your current filter criteria.
          </p>
          <p className="text-xs text-slate-500">
            Try clearing your search query or resetting the eligibility filter to view all 10 authorized national programs.
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setSearchQuery('');
              setShowSavedOnly(false);
              setEligibilityFilterActive(false);
            }}
            className="mt-2 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchemes.map((scheme) => {
            const isEligible = checkSchemeEligibility(scheme);
            const isSaved = savedSchemeIds.includes(scheme.id);
            const isCopied = copiedId === scheme.id;

            return (
              <div
                key={scheme.id}
                onClick={() => setSelectedScheme(scheme)}
                className="p-4 sm:p-5 rounded-xl border border-slate-200/90 hover:border-slate-300 bg-white transition-colors flex flex-col justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-2.5">
                  {/* Unboxed Metadata Row (Following Zero-Pill Discipline) */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-blue-700 truncate">
                        {scheme.portalName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{scheme.benefitType}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-medium ${
                          isEligible ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {isEligible ? '● Eligible Match' : '○ Check Criteria'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleSaveScheme(scheme.id, e)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title={isSaved ? 'Remove from Saved' : 'Bookmark Scheme'}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${
                            isSaved ? 'fill-blue-600 text-blue-600' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Primary Title */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                    {scheme.title}
                  </h3>

                  {/* Concise Description */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {scheme.description}
                  </p>

                  {/* Top 2 Highlights */}
                  <ul className="space-y-1 pt-1">
                    {scheme.keyHighlights.slice(0, 2).map((hl, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-700 flex items-start gap-2"
                      >
                        <span className="text-blue-600 font-bold leading-none mt-0.5">•</span>
                        <span className="line-clamp-1">{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Footer: Benefit Value, Deadline & Action Links */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900 font-mono tabular-nums">
                      {scheme.benefitSummary}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-500 font-mono tabular-nums">
                      {scheme.deadlineText}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCopyUrl(scheme.officialUrl, scheme.id, e)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      title="Copy official government portal URL"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied URL</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <span className="text-xs font-semibold text-blue-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 whitespace-nowrap">
                      <span>Application Guide</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Scheme Blueprint & Step-by-Step Application Modal */}
      {selectedScheme && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedScheme(null);
          }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700">{selectedScheme.portalName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedScheme.authority}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedScheme.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedScheme(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Key Metrics Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-500 block">Benefit / Entitlement</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                    {selectedScheme.benefitSummary}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Income Ceiling</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                    {selectedScheme.incomeLimitLakhs
                      ? `≤ ₹${selectedScheme.incomeLimitLakhs.toFixed(1)} Lakhs/yr`
                      : 'No Income Limit'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Application Window</span>
                  <span className="font-bold text-emerald-700 font-mono tabular-nums text-sm">
                    {selectedScheme.deadlineText}
                  </span>
                </div>
              </div>

              {/* Overview */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900">Scheme Overview</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {selectedScheme.description}
                </p>
              </div>

              {/* Key Highlights */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">Key Student Benefits</h4>
                <ul className="space-y-1.5">
                  {selectedScheme.keyHighlights.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Required Documents */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">
                  Required Documents (DigiLocker / OTR)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedScheme.requiredDocuments.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700"
                    >
                      {idx + 1}. {doc}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Application Flow */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">
                  Step-by-Step Official Application Workflow
                </h4>
                <div className="space-y-2">
                  {selectedScheme.applicationSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedScheme(null);
                    setIsGlobalChatOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ask AI Tutor About Eligibility</span>
                </button>

                <button
                  onClick={() =>
                    speakText(
                      `${selectedScheme.title}. Offered via ${selectedScheme.portalName}. Benefit: ${selectedScheme.benefitSummary}. ${selectedScheme.description}`
                    )
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Read Aloud</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) =>
                    handleCopyUrl(selectedScheme.officialUrl, `modal_${selectedScheme.id}`, e)
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === `modal_${selectedScheme.id}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied {selectedScheme.officialUrl}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Official URL</span>
                    </>
                  )}
                </button>

                <a
                  href={selectedScheme.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Visit {selectedScheme.portalName}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
