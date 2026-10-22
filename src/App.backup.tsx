import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
  Info,
  Key,
  Play,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  BarChart2,
  PhoneCall,
  Lock,
  ExternalLink,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Terminal,
  Eye,
  AlertOctagon,
  LifeBuoy,
  Radio,
  FileText,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FlaggedPhrase {
  phrase: string;
  category: string;
  reason: string;
  startIndex?: number;
  endIndex?: number;
}

export interface ScamCategories {
  impersonation: boolean;
  legalThreats: boolean;
  extremeUrgency: boolean;
  secrecyDemands: boolean;
  financialRequests: boolean;
  sensitiveDataRequests: boolean;
}

export interface AnalysisResult {
  riskLevel: RiskLevel;
  score: number; // 0 to 100
  flaggedPhrases: FlaggedPhrase[];
  categories: ScamCategories;
  summary: string;
  recommendedActions: string[];
  isAiGenerated: boolean;
}

export interface TestCase {
  id: string;
  title: string;
  categoryLabel: string;
  expectedRisk: RiskLevel;
  text: string;
  description: string;
  isScam: boolean;
}

export interface TestResult {
  testCase: TestCase;
  actualRisk: RiskLevel;
  score: number;
  isCorrect: boolean;
  executionTimeMs: number;
}

// ==========================================
// PRESET TEST EXAMPLES & TEST SUITE
// ==========================================

const PRESET_EXAMPLES: TestCase[] = [
  {
    id: 'cbi-arrest',
    title: 'CBI Digital Arrest & Money Demand',
    categoryLabel: 'High Risk Scam',
    expectedRisk: 'HIGH',
    isScam: true,
    description: 'Impersonates CBI officer demanding immediate fund transfer to clear money laundering charge.',
    text: `URGENT NOTICE FROM CBI OFFICERS: Your name and Aadhaar details have been linked to a major money laundering syndicate in Mumbai. You are under virtual digital arrest. Do not disconnect this call or contact anyone, including family members or local police. To cancel the non-bailable arrest warrant, immediately transfer ₹2,50,000 to the RBI clearance verification account provided. Failure to comply in 15 minutes will result in physical police deployment at your home.`
  },
  {
    id: 'police-warrant',
    title: 'Fake Police Warrant & Immediate Arrest Threat',
    categoryLabel: 'High Risk Scam',
    expectedRisk: 'HIGH',
    isScam: true,
    description: 'Fake police station notification threatening immediate arrest for illegal parcel contents.',
    text: `ATTENTION: This is Inspector Sharma from Cyber Crime Branch. A package containing illegal narcotics and fake passports sent to Taiwan using your ID was intercepted at customs. Arrest Warrant #4092 has been issued against you. Join Skype video call immediately for interrogation. Disclosing this to anyone is an offense under Official Secrets Act. Transfer security deposit to official escrow account now.`
  },
  {
    id: 'courier-secrecy',
    title: 'Secrecy & Urgent Courier Verification',
    categoryLabel: 'Medium Risk Scam',
    expectedRisk: 'MEDIUM',
    isScam: true,
    description: 'Urgent delivery message requiring fast action and unverified link click.',
    text: `Your FedEx parcel shipment #IN-984210 was held by Customs clearance due to unpaid duty tax. A re-delivery fee of ₹250 is required immediately to release the package. Do not inform courier staff. Click http://express-logistics-update.net/pay to confirm payment within 2 hours or your parcel will be impounded.`
  },
  {
    id: 'bank-statement',
    title: 'Genuine HDFC Bank Statement Alert',
    categoryLabel: 'Legitimate Notice',
    expectedRisk: 'LOW',
    isScam: false,
    description: 'Standard genuine bank e-statement email notification.',
    text: `Dear Customer, Your e-Statement for HDFC Bank account ending 4892 for the month of September is now available. To view your protected PDF statement, use your Customer ID as password. Never share your NetBanking password or OTP with anyone, even if they claim to be bank staff. For queries, visit hdfcbank.com or call customer care.`
  },
  {
    id: 'sanchar-saathi',
    title: 'Official DoT / Sanchar Saathi Verification Notice',
    categoryLabel: 'Legitimate Notice',
    expectedRisk: 'LOW',
    isScam: false,
    description: 'Official informational message regarding mobile connection verification.',
    text: `DoT Alert: Verify mobile connections registered in your name using the official Sanchar Saathi portal at sancharsaathi.gov.in. Disconnect mobile connections you do not use. Department of Telecommunications never calls asking for OTPs or biometrics. Stay cyber safe.`
  },
  {
    id: 'urgent-family',
    title: 'Urgent Family Financial Request (Ambiguous)',
    categoryLabel: 'Ambiguous / Caution',
    expectedRisk: 'MEDIUM',
    isScam: true,
    description: 'WhatsApp message impersonating a family member in urgent need of money.',
    text: `Hi Dad, my phone fell in water and this is my friend's number. I am stuck at the hospital with a friend who had an emergency. Please send ₹15,000 via UPI immediately to this hospital counter number 9812345678. I cannot take calls right now due to poor signal. Please hurry!`
  }
];

const EXTENDED_TEST_SUITE: TestCase[] = [
  ...PRESET_EXAMPLES,
  {
    id: 'trai-deactivation',
    title: 'TRAI SIM Deactivation Threat',
    categoryLabel: 'High Risk Scam',
    expectedRisk: 'HIGH',
    isScam: true,
    description: 'Threatens SIM blockage in 2 hours due to illegal activities.',
    text: 'TRAI NOTICE: All mobile connections associated with your Aadhaar will be disconnected in 2 hours due to illegal messaging activities. Press 9 to connect to TRAI verification officer or transfer ₹5,000 verification security fee.'
  },
  {
    id: 'irctc-ticket',
    title: 'Genuine IRCTC Train Booking SMS',
    categoryLabel: 'Legitimate Notice',
    expectedRisk: 'LOW',
    isScam: false,
    description: 'Standard Indian Railways booking confirmation SMS.',
    text: 'PNR: 2419823011, TRAIN: 12951, DOB: 24-OCT, CLASS: 3A, NDLS to ADI. Pass: 1. Charting Status: CHART PREPARED. Ticket status: CNF B2-34. Enjoy your journey with Indian Railways. Download official IRCTC Rail Connect app for live status.'
  }
];

// ==========================================
// FALLBACK DETERMINISTIC RULE-BASED ENGINE
// ==========================================

const RULE_PATTERNS = [
  {
    category: 'impersonation',
    categoryName: 'Fake Authority / Impersonation',
    keywords: ['cbi', 'police', 'customs', 'cyber crime', 'inspector', 'official secrets act', 'rbi', 'supreme court', 'enforcement directorate', 'ed officer', 'trai', 'telecom authority', 'department of telecommunications', 'customs officer'],
    reason: 'Claims authority from law enforcement or government institutions frequently impersonated by scammers.'
  },
  {
    category: 'legalThreats',
    categoryName: 'Threats of Arrest or Legal Action',
    keywords: ['arrest', 'warrant', 'non-bailable', 'money laundering', 'narcotics', 'illegal parcel', 'interrogation', 'police deployment', 'custody', 'court order', 'prosecution', 'jail', 'impounded'],
    reason: 'Uses coercive legal threats and intimidation tactics to induce panic.'
  },
  {
    category: 'extremeUrgency',
    categoryName: 'Extreme Urgency & Time Pressure',
    keywords: ['urgent', 'immediately', '15 minutes', '2 hours', 'tonight', 'within 10 mins', 'instant', 'right now', 'delay will result', 'deadline', 'hurry', '1 hour'],
    reason: 'Creates an artificial countdown to compel compliance before verification.'
  },
  {
    category: 'secrecyDemands',
    categoryName: 'Secrecy Demands & Isolation',
    keywords: ['do not disconnect', 'do not contact', 'do not speak', 'confidential', 'virtual digital arrest', 'keep secret', 'do not inform', "don't tell anyone", 'stay on line', 'do not take calls'],
    reason: 'Attempts to isolate the victim from family, legal counsel, or official bank verification channels.'
  },
  {
    category: 'financialRequests',
    categoryName: 'Requests for Money / Transfers',
    keywords: ['transfer', 'verification account', 'escrow account', 'clearance fee', 'security deposit', 'processing fee', 'penalty', 'gpay', 'pay now', 'upi', 'pay ₹', 'transfer ₹', 'duty tax'],
    reason: 'Pressures victim to transfer funds directly to unverified personal or escrow accounts.'
  },
  {
    category: 'sensitiveDataRequests',
    categoryName: 'Requests for Sensitive Information',
    keywords: ['otp', 'password', 'aadhaar details', 'bank account details', 'debit card', 'cvv', 'netbanking password', 'pin', 'biometric', 'passport number'],
    reason: 'Demands sensitive credentials or personal information never requested over unverified chat/phone calls.'
  }
];

function analyzeTextRuleBased(text: string): AnalysisResult {
  const lowerText = text.toLowerCase();
  const flaggedPhrases: FlaggedPhrase[] = [];
  const categories: ScamCategories = {
    impersonation: false,
    legalThreats: false,
    extremeUrgency: false,
    secrecyDemands: false,
    financialRequests: false,
    sensitiveDataRequests: false
  };

  let matchedCategoryCount = 0;

  RULE_PATTERNS.forEach((pattern) => {
    let categoryMatched = false;
    pattern.keywords.forEach((keyword) => {
      const idx = lowerText.indexOf(keyword);
      if (idx !== -1) {
        const start = Math.max(0, idx - 12);
        const end = Math.min(text.length, idx + keyword.length + 22);
        const rawExtract = text.substring(start, end).trim();

        if (!flaggedPhrases.some(f => f.phrase.toLowerCase().includes(keyword))) {
          flaggedPhrases.push({
            phrase: rawExtract,
            category: pattern.categoryName,
            reason: pattern.reason,
            startIndex: idx,
            endIndex: idx + keyword.length
          });
        }

        categoryMatched = true;
      }
    });

    if (categoryMatched) {
      categories[pattern.category as keyof ScamCategories] = true;
      matchedCategoryCount++;
    }
  });

  let score = 0;
  if (categories.impersonation) score += 25;
  if (categories.legalThreats) score += 25;
  if (categories.secrecyDemands) score += 20;
  if (categories.financialRequests) score += 15;
  if (categories.extremeUrgency) score += 10;
  if (categories.sensitiveDataRequests) score += 15;

  const safeKeywords = ['never share', 'official website', 'visit bank branch', 'free of charge', 'customer care', 'stay cyber safe', 'official sanchar saathi'];
  const hasSafeContext = safeKeywords.some(sk => lowerText.includes(sk));
  if (hasSafeContext && matchedCategoryCount <= 1) {
    score = Math.max(5, score - 35);
  }

  score = Math.min(100, Math.max(0, score));

  let riskLevel: RiskLevel = 'LOW';
  if (score >= 60) {
    riskLevel = 'HIGH';
  } else if (score >= 30) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  const recommendedActions: string[] = [
    'STOP & PAUSE IMMEDIATELY: Disconnect any phone or video call. Law enforcement never conducts digital arrests over phone or video apps.',
    'NEVER TRANSFER MONEY OR SHARE OTPS: Do not share passwords, Aadhaar, CVVs, or transfer money to unverified accounts.',
    'INDEPENDENTLY VERIFY: Contact the official organization directly using verified phone numbers or website details.',
    'REPORT FRAUD TO HELPLINE 1930: Contact the National Cyber Crime Helpline at 1930 or submit details on cybercrime.gov.in.'
  ];

  let summary = '';
  if (riskLevel === 'HIGH') {
    summary = `High Risk Scam Markers Detected! This interaction shows severe signs of impersonation, arrest threats, secrecy pressure, and financial demands.`;
  } else if (riskLevel === 'MEDIUM') {
    summary = `Medium Risk / Exercise Caution. The message exhibits artificial urgency or unverified payment/link demands requiring independent verification.`;
  } else {
    summary = `Low Risk Assessment. The message matches typical informational or official notification patterns. Always verify senders through official channels.`;
  }

  return {
    riskLevel,
    score,
    flaggedPhrases,
    categories,
    summary,
    recommendedActions,
    isAiGenerated: false
  };
}

// ==========================================
// GEMINI API INTEGRATION ENGINE
// ==========================================

async function analyzeTextGemini(text: string, apiKey: string): Promise<AnalysisResult> {
  const systemPrompt = `Act as an expert cybersecurity fraud detection engine specialized in scam analysis (Digital Arrest, Police impersonation, SIM blockage, Courier scams).
Analyze the input text and respond ONLY with a JSON object following this EXACT schema:
{
  "riskLevel": "HIGH" | "MEDIUM" | "LOW",
  "score": number, // 0 to 100 heuristic risk score
  "summary": "Concise executive summary of findings",
  "categories": {
    "impersonation": boolean,
    "legalThreats": boolean,
    "extremeUrgency": boolean,
    "secrecyDemands": boolean,
    "financialRequests": boolean,
    "sensitiveDataRequests": boolean
  },
  "flaggedPhrases": [
    {
      "phrase": "Exact phrase from original text (MUST exist word-for-word in input text)",
      "category": "Indicator Category Name",
      "reason": "Why this specific phrase is concerning"
    }
  ],
  "recommendedActions": [
    "Clear actionable safety step 1",
    "Clear actionable safety step 2"
  ]
}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: `${systemPrompt}\n\nText to analyze:\n"""\n${text}\n"""` }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Empty response received from Gemini API');
  }

  const parsed = JSON.parse(rawText);

  const validatedPhrases = (parsed.flaggedPhrases || []).filter((fp: FlaggedPhrase) =>
    fp.phrase && text.toLowerCase().includes(fp.phrase.toLowerCase().replace(/^["']|["']$/g, ''))
  );

  return {
    riskLevel: parsed.riskLevel || 'MEDIUM',
    score: typeof parsed.score === 'number' ? parsed.score : 50,
    summary: parsed.summary || 'AI Threat Analysis Completed.',
    categories: {
      impersonation: Boolean(parsed.categories?.impersonation),
      legalThreats: Boolean(parsed.categories?.legalThreats),
      extremeUrgency: Boolean(parsed.categories?.extremeUrgency),
      secrecyDemands: Boolean(parsed.categories?.secrecyDemands),
      financialRequests: Boolean(parsed.categories?.financialRequests),
      sensitiveDataRequests: Boolean(parsed.categories?.sensitiveDataRequests)
    },
    flaggedPhrases: validatedPhrases.length > 0 ? validatedPhrases : parsed.flaggedPhrases || [],
    recommendedActions: parsed.recommendedActions || [
      'Stop the conversation immediately.',
      'Never transfer money or share passwords/OTPs.',
      'Independently verify caller identity via official channels.',
      'Report fraud to Cybercrime Helpline 1930.'
    ],
    isAiGenerated: true
  };
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'dashboard' | 'guide' | 'architecture'>('analyzer');

  const [inputText, setInputText] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [activePhrase, setActivePhrase] = useState<FlaggedPhrase | null>(null);

  const [isTestingRunning, setIsTestingRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testFilter, setTestFilter] = useState<'ALL' | 'CORRECT' | 'MISSED' | 'FALSE_ALARM'>('ALL');

  const wordCount = useMemo(() => {
    return inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  }, [inputText]);

  useEffect(() => {
    const savedKey = localStorage.getItem('cybershield_gemini_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    handleSelectPreset('cbi-arrest');
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('cybershield_gemini_key', key);
    setShowApiKeyModal(false);
  };

  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    const found = PRESET_EXAMPLES.find(p => p.id === id);
    if (found) {
      setInputText(found.text);
      setAnalysisResult(null);
      setAnalysisError(null);
      setActivePhrase(null);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setAnalysisError('Please paste or type a suspicious message, chat text, or call transcript to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setActivePhrase(null);

    try {
      if (apiKey.trim()) {
        try {
          const aiResult = await analyzeTextGemini(inputText, apiKey.trim());
          setAnalysisResult(aiResult);
        } catch (apiErr: any) {
          console.warn('Gemini API call failed, falling back to offline rule engine:', apiErr);
          const fallbackResult = analyzeTextRuleBased(inputText);
          setAnalysisResult({
            ...fallbackResult,
            summary: `(Offline Rule Engine): ${fallbackResult.summary}`
          });
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        const ruleResult = analyzeTextRuleBased(inputText);
        setAnalysisResult(ruleResult);
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'An error occurred during threat analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunTestSuite = async () => {
    setIsTestingRunning(true);
    setTestResults([]);

    const results: TestResult[] = [];

    for (const testCase of EXTENDED_TEST_SUITE) {
      const startTime = performance.now();
      let res: AnalysisResult;

      if (apiKey.trim()) {
        try {
          res = await analyzeTextGemini(testCase.text, apiKey.trim());
        } catch {
          res = analyzeTextRuleBased(testCase.text);
        }
      } else {
        res = analyzeTextRuleBased(testCase.text);
      }

      const endTime = performance.now();

      const isExpectedScam = testCase.expectedRisk === 'HIGH' || testCase.expectedRisk === 'MEDIUM';
      const isActualScam = res.riskLevel === 'HIGH' || res.riskLevel === 'MEDIUM';
      const isCorrect = isExpectedScam === isActualScam;

      results.push({
        testCase,
        actualRisk: res.riskLevel,
        score: res.score,
        isCorrect,
        executionTimeMs: Math.round(endTime - startTime)
      });
    }

    setTestResults(results);
    setIsTestingRunning(false);
  };

  const dashboardMetrics = useMemo(() => {
    if (testResults.length === 0) return null;

    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    testResults.forEach(r => {
      const isExpectedScam = r.testCase.expectedRisk === 'HIGH' || r.testCase.expectedRisk === 'MEDIUM';
      const isActualScam = r.actualRisk === 'HIGH' || r.actualRisk === 'MEDIUM';

      if (isExpectedScam && isActualScam) tp++;
      else if (!isExpectedScam && isActualScam) fp++;
      else if (!isExpectedScam && !isActualScam) tn++;
      else if (isExpectedScam && !isActualScam) fn++;
    });

    const total = testResults.length;
    const accuracy = ((tp + tn) / total) * 100;
    const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
    const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
    const f1 = (precision + recall) > 0 ? 2 * ((precision * recall) / (precision + recall)) : 0;

    return { tp, fp, tn, fn, total, accuracy, precision, recall, f1 };
  }, [testResults]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const renderHighlightedText = () => {
    if (!analysisResult || !inputText) return inputText;

    const phrases = analysisResult.flaggedPhrases;
    if (!phrases || phrases.length === 0) {
      return <span className="text-slate-200 leading-relaxed font-sans">{inputText}</span>;
    }

    let matches: { start: number; end: number; phrase: string; obj: FlaggedPhrase }[] = [];

    phrases.forEach(fp => {
      const cleanPhrase = fp.phrase.replace(/^["'\s]+|["'\s]+$/g, '');
      if (!cleanPhrase) return;
      const idx = inputText.toLowerCase().indexOf(cleanPhrase.toLowerCase());
      if (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + cleanPhrase.length,
          phrase: inputText.substring(idx, idx + cleanPhrase.length),
          obj: fp
        });
      }
    });

    matches.sort((a, b) => a.start - b.start);

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((m, idx) => {
      if (m.start >= lastIndex) {
        if (m.start > lastIndex) {
          elements.push(
            <span key={`text-${lastIndex}`} className="text-slate-200">
              {inputText.substring(lastIndex, m.start)}
            </span>
          );
        }

        const isSelected = activePhrase?.phrase === m.obj.phrase;
        elements.push(
          <mark
            key={`highlight-${idx}`}
            onClick={() => setActivePhrase(m.obj)}
            className={`cursor-pointer transition-all duration-200 px-1 py-0.5 rounded font-semibold border ${
              isSelected
                ? 'bg-amber-400/30 text-amber-200 border-amber-400 ring-2 ring-amber-400/40'
                : 'bg-red-500/25 text-red-200 border-red-500/50 hover:bg-red-500/40'
            }`}
            title="Click to view warning sign reasoning"
          >
            {m.phrase}
          </mark>
        );

        lastIndex = m.end;
      }
    });

    if (lastIndex < inputText.length) {
      elements.push(
        <span key={`text-${lastIndex}`} className="text-slate-200">
          {inputText.substring(lastIndex)}
        </span>
      );
    }

    return <div className="leading-relaxed whitespace-pre-wrap font-sans text-sm md:text-base">{elements}</div>;
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* HEADER BAR */}
      <header className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg md:text-xl tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
                CyberShield AI
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800">
                PROTOTYPE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Detect the Threat. Understand the Risk. Stay Protected.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              apiKey
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/50'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-mono">
              {apiKey ? 'Gemini AI Connected' : 'Offline Engine Active'}
            </span>
            <span className="md:hidden font-mono">{apiKey ? 'Gemini' : 'Rule'}</span>
          </button>

          <a
            href="tel:1930"
            className="flex items-center space-x-1.5 bg-red-950/80 hover:bg-red-900/80 border border-red-600/60 text-red-400 text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm shadow-red-900/30"
          >
            <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
            <span>1930 Helpline</span>
          </a>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="bg-[#0F172A] border-b border-slate-800 px-4 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="flex space-x-1 sm:space-x-4">
          <button
            onClick={() => setActiveTab('analyzer')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'analyzer'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Threat Analyzer</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Testing & Evaluation</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Defense Resource Center</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>System Architecture</span>
          </button>
        </div>
      </nav>

      {/* CORE FEATURE SPECIFICATION HEADER BANNER */}
      <div className="bg-[#0F172A] border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <strong className="text-slate-200">Core Engine Modules:</strong>
          </span>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-mono">
              Feature 1: Scam Message Analyzer
            </span>
            <span className="px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800/60 text-teal-300 font-mono">
              Feature 2: Explainable Risk Score
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-mono">
              Feature 3: Safe Action Assistant
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* ========================================== */}
        {/* MODULE 1: THREAT ANALYZER */}
        {/* ========================================== */}
        {activeTab === 'analyzer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: FEATURE 1 (SCAM MESSAGE ANALYZER) */}
            <div className="lg:col-span-6 space-y-5">
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                        Feature 1 — MUST BUILD
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2 pt-1">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span>Scam Message & Transcript Analyzer</span>
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {inputText.length} chars | {wordCount} words
                  </span>
                </div>

                {/* Preset Dropdown Loader */}
                <div className="mb-3">
                  <div className="text-xs text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                    <span>Select Preset Test Message:</span>
                    <span className="text-[10px] text-cyan-400">6 Scenarios</span>
                  </div>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer font-sans"
                  >
                    <option value="" disabled>-- Select a test case --</option>
                    {PRESET_EXAMPLES.map(ex => (
                      <option key={ex.id} value={ex.id}>
                        [{ex.categoryLabel}] {ex.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Text Input Area */}
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setSelectedPresetId('');
                  }}
                  placeholder="Paste suspicious SMS, WhatsApp message, chat text, or call transcript here..."
                  className="w-full h-48 bg-[#0F172A] border border-slate-700/80 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all resize-none font-sans leading-relaxed"
                />

                {/* Control Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setInputText('');
                        setAnalysisResult(null);
                        setAnalysisError(null);
                        setSelectedPresetId('');
                        setActivePhrase(null);
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all border border-slate-700 flex items-center space-x-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>

                    <button
                      onClick={() => {
                        const randomEx = PRESET_EXAMPLES[Math.floor(Math.random() * PRESET_EXAMPLES.length)];
                        handleSelectPreset(randomEx.id);
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all border border-slate-700 flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Random Example</span>
                    </button>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !inputText.trim()}
                    className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-lg transition-all ${
                      isAnalyzing || !inputText.trim()
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black shadow-cyan-500/20 active:scale-[0.98]'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Analyzing Message...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Analyze Threat</span>
                      </>
                    )}
                  </button>
                </div>

                {analysisError && (
                  <div className="mt-4 p-3.5 bg-red-950/80 border border-red-500/60 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{analysisError}</span>
                  </div>
                )}
              </div>

              {/* Categorized Indicator Checklist Matrix */}
              {analysisResult && (
                <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>6 Scam Indicator Categories Scan</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {[
                      { label: 'Fake Authority Claims', key: 'impersonation' },
                      { label: 'Threats & Arrest Action', key: 'legalThreats' },
                      { label: 'Extreme Urgency & Pressure', key: 'extremeUrgency' },
                      { label: 'Secrecy & Isolation Demands', key: 'secrecyDemands' },
                      { label: 'Money & Transfer Demands', key: 'financialRequests' },
                      { label: 'Requests for Sensitive Data', key: 'sensitiveDataRequests' }
                    ].map(item => {
                      const detected = analysisResult.categories[item.key as keyof ScamCategories];
                      return (
                        <div
                          key={item.key}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                            detected
                              ? 'bg-red-950/40 border-red-500/50 text-red-300'
                              : 'bg-[#0F172A] border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          {detected ? (
                            <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: FEATURE 2 (EXPLAINABLE RISK SCORE) & FEATURE 3 (SAFE ACTION ASSISTANT) */}
            <div className="lg:col-span-6 space-y-5">
              {!analysisResult && !isAnalyzing && (
                <div className="bg-[#1E293B] border border-slate-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[440px] space-y-4">
                  <div className="p-4 bg-[#0F172A] border border-slate-800 rounded-2xl text-slate-500">
                    <Shield className="w-10 h-10 text-cyan-500/60" />
                  </div>
                  <div className="max-w-md">
                    <h3 className="font-semibold text-slate-200 text-base">Awaiting Message Analysis</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Paste a suspicious SMS, chat text, or call transcript on the left to generate an explainable risk score, exact phrase highlighting, and actionable safety guidance.
                    </p>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[440px] space-y-5 relative overflow-hidden">
                  <div className="relative flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                    <Activity className="w-8 h-8 text-cyan-400 absolute animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-slate-200">Analyzing Threat Patterns...</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {apiKey ? 'Evaluating with Gemini AI...' : 'Scanning with Rule Engine...'}
                    </p>
                  </div>
                </div>
              )}

              {analysisResult && !isAnalyzing && (
                <div className="space-y-5">
                  {/* FEATURE 2 — EXPLAINABLE RISK SCORE GAUGE & BADGE */}
                  <div className={`border rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden ${
                    analysisResult.riskLevel === 'HIGH'
                      ? 'bg-gradient-to-br from-red-950/50 via-[#1E293B] to-[#1E293B] border-red-500/60'
                      : analysisResult.riskLevel === 'MEDIUM'
                      ? 'bg-gradient-to-br from-amber-950/50 via-[#1E293B] to-[#1E293B] border-amber-500/60'
                      : 'bg-gradient-to-br from-emerald-950/50 via-[#1E293B] to-[#1E293B] border-emerald-500/60'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-teal-950 text-teal-400 border border-teal-800 rounded">
                          Feature 2 — MUST BUILD
                        </span>
                        <div className="flex items-center space-x-2.5 pt-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                            analysisResult.riskLevel === 'HIGH'
                              ? 'bg-red-500/20 text-red-400 border-red-500/50'
                              : analysisResult.riskLevel === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          }`}>
                            {analysisResult.riskLevel} RISK
                          </span>

                          <span className="text-xs text-slate-400 font-mono">
                            {analysisResult.isAiGenerated ? 'Gemini AI Verified' : 'Rule Engine Verified'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl font-black font-mono tracking-tight text-slate-100">
                          {analysisResult.score}<span className="text-slate-500 text-sm">/100</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">Explainable Risk Score</div>
                      </div>
                    </div>

                    {/* Semi-Circle Radial Progress Gauge */}
                    <div className="mt-4">
                      <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            analysisResult.score >= 60
                              ? 'bg-gradient-to-r from-amber-500 to-red-500'
                              : analysisResult.score >= 30
                              ? 'bg-gradient-to-r from-teal-500 to-amber-500'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          }`}
                          style={{ width: `${analysisResult.score}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 italic">
                        *Heuristic pattern score indicating threat indicator density, not definitive legal guilt.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-200 leading-relaxed">
                      {analysisResult.summary}
                    </div>
                  </div>

                  {/* FEATURE 2 EXPLAINABLE PHRASE HIGHLIGHTER */}
                  <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-cyan-400" />
                        <span>Exact Flagged Phrases ({analysisResult.flaggedPhrases.length})</span>
                      </h3>
                      <span className="text-[10px] text-slate-400">Click highlighted text for explanation</span>
                    </div>

                    {/* Interactive Text Viewer */}
                    <div className="p-4 bg-[#0F172A] border border-slate-800 rounded-xl max-h-52 overflow-y-auto">
                      {renderHighlightedText()}
                    </div>

                    {/* Active Phrase Explanation Card */}
                    {activePhrase && (
                      <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                        <div className="flex items-center justify-between font-semibold text-amber-300">
                          <span className="flex items-center space-x-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Warning Sign Reason</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700 font-mono">
                            {activePhrase.category}
                          </span>
                        </div>
                        <p className="font-mono text-slate-200 font-medium">"{activePhrase.phrase}"</p>
                        <p className="text-slate-300 text-[11px] leading-relaxed pt-1 border-t border-amber-500/20">
                          <strong className="text-amber-200">Why concerning:</strong> {activePhrase.reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* FEATURE 3 — SAFE ACTION ASSISTANT */}
                  <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                          Feature 3 — MUST BUILD
                        </span>
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2 pt-1">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Safe Action Assistant</span>
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {analysisResult.recommendedActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-slate-200 flex items-start space-x-2.5"
                        >
                          <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{action}</span>
                        </div>
                      ))}
                    </div>

                    {/* Quick Helpline Trigger Card */}
                    <div className="p-4 bg-gradient-to-r from-red-950/60 to-[#0F172A] border border-red-500/50 rounded-xl flex items-center justify-between mt-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-red-300">Target of Financial Cyber Fraud?</div>
                        <div className="text-[11px] text-slate-400">Call India Cybercrime Helpline immediately.</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCopy('1930', '1930')}
                          className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800/80 border border-red-500/60 text-red-200 text-xs font-bold rounded-lg transition-all flex items-center space-x-1"
                        >
                          {copiedText === '1930' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>1930</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* MODULE 2: TESTING & EVALUATION DASHBOARD */}
        {/* ========================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <BarChart2 className="w-5 h-5 text-cyan-400" />
                  <span>Batch Testing & Metrics Dashboard</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Run evaluation across labeled test vectors (Digital Arrest, Police threats, bank statement notices, IRCTC confirmations).
                </p>
              </div>

              <button
                onClick={handleRunTestSuite}
                disabled={isTestingRunning}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 shrink-0"
              >
                {isTestingRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Evaluation...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Full Test Suite ({EXTENDED_TEST_SUITE.length} Vectors)</span>
                  </>
                )}
              </button>
            </div>

            {/* Metrics Cards & Confusion Matrix */}
            {dashboardMetrics ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#1E293B] border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Accuracy</div>
                    <div className="text-2xl font-black font-mono text-cyan-400">
                      {dashboardMetrics.accuracy.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500">Overall correctness</div>
                  </div>

                  <div className="bg-[#1E293B] border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Precision</div>
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      {dashboardMetrics.precision.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500">Scam precision</div>
                  </div>

                  <div className="bg-[#1E293B] border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Recall</div>
                    <div className="text-2xl font-black font-mono text-teal-400">
                      {dashboardMetrics.recall.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500">True scam capture</div>
                  </div>

                  <div className="bg-[#1E293B] border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">F1 Score</div>
                    <div className="text-2xl font-black font-mono text-purple-400">
                      {dashboardMetrics.f1.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500">Harmonic mean</div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Confusion Matrix
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-center text-xs">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl space-y-0.5">
                      <div className="text-lg font-black font-mono text-emerald-400">{dashboardMetrics.tp}</div>
                      <div className="text-[10px] font-medium text-slate-300">True Positives (TP)</div>
                      <div className="text-[9px] text-slate-500">Scams correctly flagged</div>
                    </div>

                    <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl space-y-0.5">
                      <div className="text-lg font-black font-mono text-red-400">{dashboardMetrics.fp}</div>
                      <div className="text-[10px] font-medium text-slate-300">False Positives (FP)</div>
                      <div className="text-[9px] text-slate-500">Safe misflagged as scam</div>
                    </div>

                    <div className="p-3 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-0.5">
                      <div className="text-lg font-black font-mono text-amber-400">{dashboardMetrics.fn}</div>
                      <div className="text-[10px] font-medium text-slate-300">False Negatives (FN)</div>
                      <div className="text-[9px] text-slate-500">Scams missed as safe</div>
                    </div>

                    <div className="p-3 bg-blue-950/40 border border-blue-500/50 rounded-xl space-y-0.5">
                      <div className="text-lg font-black font-mono text-blue-400">{dashboardMetrics.tn}</div>
                      <div className="text-[10px] font-medium text-slate-300">True Negatives (TN)</div>
                      <div className="text-[9px] text-slate-500">Safe correctly cleared</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#1E293B] border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-xs">
                Click "Run Full Test Suite" above to execute real-time evaluation across test vectors and view accuracy, precision, and confusion matrix stats.
              </div>
            )}

            {/* Test Cases Execution Table */}
            {testResults.length > 0 && (
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Test Vector Execution Results ({testResults.length} Cases)
                  </h3>

                  <div className="flex space-x-1.5 text-xs">
                    {(['ALL', 'CORRECT', 'MISSED', 'FALSE_ALARM'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setTestFilter(f)}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          testFilter === f
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-semibold'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {f.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                        <th className="py-2.5 px-3">Test Scenario</th>
                        <th className="py-2.5 px-3">Expected</th>
                        <th className="py-2.5 px-3">Actual Result</th>
                        <th className="py-2.5 px-3">Score</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {testResults
                        .filter(r => {
                          if (testFilter === 'CORRECT') return r.isCorrect;
                          if (testFilter === 'MISSED') return !r.isCorrect && r.testCase.isScam;
                          if (testFilter === 'FALSE_ALARM') return !r.isCorrect && !r.testCase.isScam;
                          return true;
                        })
                        .map(r => (
                          <tr key={r.testCase.id} className="hover:bg-slate-800/40 transition-all">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-200">{r.testCase.title}</div>
                              <div className="text-[10px] text-slate-500 truncate max-w-xs">{r.testCase.description}</div>
                            </td>

                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.testCase.expectedRisk === 'HIGH' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
                              }`}>
                                {r.testCase.expectedRisk}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.actualRisk === 'HIGH' ? 'bg-red-950 text-red-400' : r.actualRisk === 'MEDIUM' ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
                              }`}>
                                {r.actualRisk}
                              </span>
                            </td>

                            <td className="py-3 px-3 font-mono font-bold text-slate-300">
                              {r.score}/100
                            </td>

                            <td className="py-3 px-3">
                              {r.isCorrect ? (
                                <span className="text-emerald-400 flex items-center space-x-1 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Passed</span>
                                </span>
                              ) : (
                                <span className="text-red-400 flex items-center space-x-1 font-medium">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Failed</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setInputText(r.testCase.text);
                                  setActiveTab('analyzer');
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded-lg border border-slate-700 transition-all"
                              >
                                Test in Analyzer
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-[#0F172A] border border-slate-800 rounded-xl text-[11px] text-slate-400 leading-relaxed">
                  <strong>Evaluation Note:</strong> Small synthetic test sets serve to verify engine classification accuracy against key scam patterns.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* MODULE 3: DEFENSE RESOURCE CENTER */}
        {/* ========================================== */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-950/70 via-[#1E293B] to-[#1E293B] border border-red-500/50 rounded-2xl p-6 shadow-xl space-y-2">
              <div className="flex items-center space-x-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4" />
                <span>Emergency Digital Arrest Defense Protocol</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                Action Steps if Threat Call or Message Received
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                Scammers impersonating Police, CBI, TRAI, or Customs keep victims under "digital arrest" via video/audio calls to extort money. Follow these emergency defense guidelines:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="p-2.5 bg-red-950/70 border border-red-500/50 rounded-xl w-fit text-red-400">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-200 text-sm">1. Call Helpline 1930</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Report immediately if money was transferred. Reporting within the golden hours helps freeze fraud accounts.
                </p>
                <button
                  onClick={() => handleCopy('1930', 'helpline')}
                  className="w-full py-2 bg-red-900/60 hover:bg-red-800/60 border border-red-500/50 text-red-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedText === 'helpline' ? 'Copied 1930!' : 'Copy Helpline 1930'}</span>
                </button>
              </div>

              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="p-2.5 bg-cyan-950/70 border border-cyan-500/50 rounded-xl w-fit text-cyan-400">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-200 text-sm">2. Cybercrime Portal</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  File an official complaint online with transaction details, caller numbers, and screenshots at cybercrime.gov.in.
                </p>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-500/50 text-cyan-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
                >
                  <span>Visit cybercrime.gov.in</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="p-2.5 bg-amber-950/70 border border-amber-500/50 rounded-xl w-fit text-amber-400">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-200 text-sm">3. Chakshu & Sanchar Saathi</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Report suspicious callers, fake TRAI messages, and fraudulent WhatsApp handles to the Department of Telecommunications.
                </p>
                <a
                  href="https://sancharsaathi.gov.in/sfc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-amber-950/70 hover:bg-amber-900/70 border border-amber-500/50 text-amber-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
                >
                  <span>Report on Chakshu</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Golden Rules Against Digital Arrest Scams</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-[#0F172A] border border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-red-400 flex items-center space-x-2">
                    <XCircle className="w-4 h-4" />
                    <span>Official Police / Law Agencies Never:</span>
                  </div>
                  <ul className="list-disc list-inside text-slate-300 space-y-1.5 leading-relaxed pl-1">
                    <li>Arrest anyone over Skype, Zoom, or WhatsApp video calls.</li>
                    <li>Demand money transfers to personal or "clearance" escrow accounts.</li>
                    <li>Threaten immediate arrest without official written summons.</li>
                    <li>Order you to keep an investigation secret from family.</li>
                  </ul>
                </div>

                <div className="p-4 bg-[#0F172A] border border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Immediate Safe Steps You Should Take:</span>
                  </div>
                  <ul className="list-disc list-inside text-slate-300 space-y-1.5 leading-relaxed pl-1">
                    <li>Disconnect the video or audio call immediately.</li>
                    <li>Inform family members or local police station officers.</li>
                    <li>Independently verify caller identity through official channels.</li>
                    <li>Report the scammer's bank and phone details to Helpline 1930.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* MODULE 4: SYSTEM ARCHITECTURE & PRIVACY */}
        {/* ========================================== */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <span>Technical System Architecture & Data Pipeline</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Built with a hybrid dual-engine architecture, local in-memory text processing, and explainable phrase outputs.
                </p>
              </div>

              {/* Diagrammatic Pipeline Flowchart */}
              <div className="p-6 bg-[#0F172A] border border-slate-800 rounded-2xl space-y-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">4-Stage Pipeline Flowchart</div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center text-xs">
                  <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-cyan-400">1. Text Ingestion</div>
                    <div className="text-[10px] text-slate-400">SMS, WhatsApp Chat, or Call Transcript Input</div>
                  </div>

                  <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-teal-400">2. Hybrid Detection Engine</div>
                    <div className="text-[10px] text-slate-400">Gemini AI LLM or Offline Deterministic Pattern Engine</div>
                  </div>

                  <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-amber-400">3. Vector & Phrase Mapping</div>
                    <div className="text-[10px] text-slate-400">Density Score & Phrase Highlighting Extraction</div>
                  </div>

                  <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-emerald-400">4. Explainable Guidance</div>
                    <div className="text-[10px] text-slate-400">Actionable Steps & Cybercrime Helpline 1930</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-5 bg-[#0F172A] border border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-slate-200 flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    <span>Zero Data Retention Commitment</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Submitted text is processed in-memory for immediate analysis only. Messages are never saved, stored in databases, or used for model training.
                  </p>
                </div>

                <div className="p-5 bg-[#0F172A] border border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-slate-200 flex items-center space-x-2">
                    <Info className="w-4 h-4 text-amber-400" />
                    <span>Advisory Risk Disclosure</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    CyberShield AI provides heuristic risk guidance to support human decision-making under high-pressure interactions. It does not monitor active calls in the background or claim definitive legal proof.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* GEMINI API CONFIG MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 font-bold text-slate-100 text-sm">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Configure Gemini API Key</span>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter a Google Gemini API key to enable LLM contextual analysis. If unconfigured, CyberShield AI runs seamlessly using its offline deterministic rule engine.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">Gemini API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-400 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleSaveApiKey('')}
                className="text-xs text-red-400 hover:underline"
              >
                Clear Key
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveApiKey(apiKey)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 hover:opacity-90"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-[#0F172A] py-4 px-4 text-center text-xs text-slate-500 space-y-1">
        <div>
          <strong>CyberShield AI</strong> — AI Cyber Threat & Fraud Detection Platform
        </div>
        <div className="text-[10px]">
          Designed for Digital Arrest & Cyber Fraud Prevention | Cybercrime Helpline: 1930
        </div>
      </footer>
    </div>
  );
}
