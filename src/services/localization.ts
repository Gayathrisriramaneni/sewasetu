export type Language = 'en' | 'hi';

export interface TranslationStrings {
  portalTitle: string;
  departmentTitle: string;
  schemeTitle: string;
  monthlyAmount: string;
  eligibilitySummary: string;
  applyButton: string;
  checkStatusButton: string;
  smsConsoleButton: string;
  stepIndicator: string;
  preflightTitle: string;
  preflightDesc: string;
  needMobile: string;
  needAgeProof: string;
  needBank: string;
  stepMobileTitle: string;
  stepPersonalTitle: string;
  stepAddressTitle: string;
  stepBankTitle: string;
  stepUploadTitle: string;
  stepReviewTitle: string;
  stepDeclarationTitle: string;
  fullNameLabel: string;
  dobLabel: string;
  genderLabel: string;
  maritalLabel: string;
  villageLabel: string;
  blockLabel: string;
  bankAccountLabel: string;
  ifscLabel: string;
  uploadDocLabel: string;
  saveContinue: string;
  backButton: string;
  submitApplication: string;
  kioskBanner: string;
  clearKioskSession: string;
  reviewTitle: string;
  reviewNotice: string;
  calculatedAge: string;
  eligibleBadge: string;
  ineligibleBadge: string;
  maskedAccountNote: string;
}

export const translations: Record<Language, TranslationStrings> = {
  en: {
    portalTitle: "Sewa Setu — Old Age Pension Portal",
    departmentTitle: "Department of Social Welfare · Government of Purvanchal",
    schemeTitle: "Old Age Pension Scheme",
    monthlyAmount: "Rs. 250 per month",
    eligibilitySummary: "Eligible for senior citizens aged 60 years or older residing in Purvanchal.",
    applyButton: "Apply for Pension",
    checkStatusButton: "Check Application Status",
    smsConsoleButton: "SMS Gateway Console",
    stepIndicator: "Step",
    preflightTitle: "What you will need before applying",
    preflightDesc: "Please keep these 3 items ready to complete the application easily:",
    needMobile: "1. An active Indian mobile number to receive your SMS OTP verification.",
    needAgeProof: "2. Age proof document (Voter ID, School certificate, or Birth certificate) as JPG or PDF (max 5 MB).",
    needBank: "3. Bank passbook or details (Account number & IFSC code) in the applicant's name for direct DBT deposit.",
    stepMobileTitle: "Mobile Verification (SMS OTP)",
    stepPersonalTitle: "Personal Details",
    stepAddressTitle: "Address Details",
    stepBankTitle: "Bank Account Details",
    stepUploadTitle: "Upload Age Proof",
    stepReviewTitle: "Review Application Details",
    stepDeclarationTitle: "Statutory Declaration",
    fullNameLabel: "Full Name of Applicant (as per Aadhaar)",
    dobLabel: "Date of Birth (DD/MM/YYYY)",
    genderLabel: "Gender",
    maritalLabel: "Marital Status",
    villageLabel: "Village / Town Name",
    blockLabel: "Development Block",
    bankAccountLabel: "Bank Account Number",
    ifscLabel: "Bank IFSC Code",
    uploadDocLabel: "Select Age Proof Document (JPG or PDF)",
    saveContinue: "Save & Continue",
    backButton: "Back",
    submitApplication: "Submit Official Application",
    kioskBanner: "Public Kiosk / CSC Operator Mode active. Protect citizen confidentiality by clearing session after completion.",
    clearKioskSession: "Exit Kiosk / Clear Session",
    reviewTitle: "Review Details Before Final Submission",
    reviewNotice: "Please review all information carefully. You can click 'Edit' to change any section before submitting.",
    calculatedAge: "Calculated Age",
    eligibleBadge: "Eligible (Age 60+)",
    ineligibleBadge: "Ineligible (Under 60)",
    maskedAccountNote: "Account number masked for shared-screen privacy. Verified by system.",
  },
  hi: {
    portalTitle: "सेवा सेतु — वृद्धावस्था पेंशन पोर्टल",
    departmentTitle: "समाज कल्याण विभाग · पूर्वांचल सरकार",
    schemeTitle: "वृद्धावस्था पेंशन योजना",
    monthlyAmount: "रु 250 प्रति माह",
    eligibilitySummary: "पूर्वांचल के 60 वर्ष या उससे अधिक आयु के वरिष्ठ नागरिकों के लिए पात्र।",
    applyButton: "पेंशन के लिए आवेदन करें",
    checkStatusButton: "आवेदन की स्थिति जांचें",
    smsConsoleButton: "एसएमएस गेटवे कंसोल",
    stepIndicator: "चरण",
    preflightTitle: "आवेदन शुरू करने से पहले क्या आवश्यक है",
    preflightDesc: "आवेदन आसानी से पूरा करने के लिए कृपया ये 3 चीजें तैयार रखें:",
    needMobile: "1. ओटीपी प्राप्त करने के लिए सक्रिय भारतीय मोबाइल नंबर।",
    needAgeProof: "2. आयु प्रमाण पत्र (मतदाता पहचान पत्र, स्कूल प्रमाण पत्र या जन्म प्रमाण पत्र) जेपीजी या पीडीएफ (अधिकतम 5 एमबी)।",
    needBank: "3. डीबीटी के लिए आवेदक के नाम पर बैंक पासबुक (खाता संख्या और आईएफएससी कोड)।",
    stepMobileTitle: "मोबाइल सत्यापन (एसएमएस ओटीपी)",
    stepPersonalTitle: "व्यक्तिगत विवरण",
    stepAddressTitle: "पता विवरण",
    stepBankTitle: "बैंक खाता विवरण",
    stepUploadTitle: "आयु प्रमाण पत्र अपलोड करें",
    stepReviewTitle: "आवेदन विवरण की समीक्षा करें",
    stepDeclarationTitle: "वैधानिक घोषणा",
    fullNameLabel: "आवेदक का पूरा नाम (आधार के अनुसार)",
    dobLabel: "जन्म तिथि (दिन/माह/वर्ष)",
    genderLabel: "लिंग",
    maritalLabel: "वैवाहिक स्थिति",
    villageLabel: "गांव / कस्बा का नाम",
    blockLabel: "विकास खंड (ब्लॉक)",
    bankAccountLabel: "बैंक खाता संख्या",
    ifscLabel: "बैंक आईएफएससी कोड",
    uploadDocLabel: "दस्तावेज़ चुनें (जेपीजी या पीडीएफ)",
    saveContinue: "सहेजें और आगे बढ़ें",
    backButton: "पीछे जाएं",
    submitApplication: "अंतिम आवेदन जमा करें",
    kioskBanner: "सीएससी / सार्वजनिक कियोस्क मोड सक्रिय। काम पूरा होने पर सत्र साफ करें।",
    clearKioskSession: "सत्र साफ करें (डेटा हटाएं)",
    reviewTitle: "जमा करने से पहले विवरण की समीक्षा करें",
    reviewNotice: "कृपया सभी विवरण ध्यान से जांचें। किसी भी भाग को बदलने के लिए 'संशोधन' पर क्लिक कर सकते हैं।",
    calculatedAge: "गणना की गई आयु",
    eligibleBadge: "पात्र (आयु 60+ वर्ष)",
    ineligibleBadge: "अपात्र (60 वर्ष से कम)",
    maskedAccountNote: "गोपनीयता के लिए खाता संख्या आंशिक रूप से छिपाई गई है।",
  }
};
