import React, { useState, useEffect } from 'react';
import { BLOCKS, MIN_AGE, store, calculateAge, getDeadlineRemainingHours, normalizeIndianMobile } from '../data/store';
import { FormDataState } from '../types';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Check,
  ShieldAlert,
  Edit2,
  Eye,
  EyeOff,
  HelpCircle,
  Phone,
  Landmark,
  FileCheck,
  Mail,
  MessageSquare
} from 'lucide-react';
import { Language, translations } from '../services/localization';

interface ApplyWizardViewProps {
  navigate: (route: string) => void;
  onSuccess: (appNo: string, appId: number) => void;
  language?: Language;
  onResetDraft?: () => void;
}

export const ApplyWizardView: React.FC<ApplyWizardViewProps> = ({
  navigate,
  onSuccess,
  language = 'en',
  onResetDraft,
}) => {
  const t = translations[language];

  // Wizard steps:
  // Wizard steps:
  // 1: Mobile + Captcha
  // 1.5: Mobile OTP Verification
  // 2: Personal Details
  // 3: Address Details
  // 4: Bank Details
  // 5: Document Upload
  // 6: Comprehensive Review Screen (Persona 1 & 2 friendly)
  // 7: Statutory Declaration
  const [step, setStep] = useState<number>(1);
  const [mobile, setMobile] = useState<string>('');
  const [verifiedMobile, setVerifiedMobile] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [otpInput, setOtpInput] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [captchaQuestion, setCaptchaQuestion] = useState<{ a: number; b: number }>({ a: 4, b: 7 });

  const [formData, setFormData] = useState<FormDataState>({
    applicant_name: '',
    dob: '',
    gender: '',
    marital_status: '',
    husband_name: '',
    husband_employer: '',
    village: '',
    block: '',
    bank_account: '',
    ifsc: '',
    mobile: '',
    email: '',
    doc_name: '',
    doc_size: 0,
  });

  const [showFullAccount, setShowFullAccount] = useState<boolean>(false);
  const [declarationAgreed, setDeclarationAgreed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);

  // Dependent Block -> Village Dropdown State
  const [villageSelection, setVillageSelection] = useState<string>('');
  const [manualVillageInput, setManualVillageInput] = useState<string>('');
  const [availableVillages, setAvailableVillages] = useState<string[]>([]);
  const [isLoadingVillages, setIsLoadingVillages] = useState<boolean>(false);
  const [villageLoadError, setVillageLoadError] = useState<string | null>(null);

  const activeBlockReqRef = React.useRef<string>('');

  // Live age calculation
  const calculatedAge = formData.dob ? calculateAge(formData.dob) : null;

  // Initialize random math captcha
  const generateNewCaptcha = () => {
    const a = Math.floor(1 + Math.random() * 9);
    const b = Math.floor(1 + Math.random() * 9);
    setCaptchaQuestion({ a, b });
    setCaptchaAnswer('');
  };

  useEffect(() => {
    generateNewCaptcha();
  }, []);

  // 15-second resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Helper for masking bank account (privacy on shared/CSC screens)
  const getMaskedAccount = (acc?: string) => {
    if (!acc) return '';
    if (acc.length <= 4) return acc;
    const last4 = acc.slice(-4);
    return '•••• •••• ' + last4;
  };

  // Step 1: Send OTP to Mobile
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingOtp) return;
    setIsSendingOtp(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const norm = normalizeIndianMobile(mobile);
    if (!norm) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      setIsSendingOtp(false);
      return;
    }

    if (parseInt(captchaAnswer, 10) !== (captchaQuestion.a + captchaQuestion.b)) {
      setErrorMsg("Security check answer is incorrect. Please try again.");
      generateNewCaptcha();
      setIsSendingOtp(false);
      return;
    }

    // Check duplicate by mobile number
    const existing = store.getApplicationByMobile(norm);
    if (existing) {
      setErrorMsg(`An application (${existing.application_no}) already exists for mobile number ${norm}. Duplicate applications are not permitted.`);
      setIsSendingOtp(false);
      return;
    }

    const otpResult = store.generateMobileOtp(norm, 'APPLICATION');
    if (!otpResult.success) {
      setErrorMsg(otpResult.error || "Failed to generate OTP.");
      setIsSendingOtp(false);
      return;
    }

    setResendCooldown(15);
    setInfoMsg(`OTP dispatched via SMS to +91 ${norm}. Check your mobile SMS inbox or the Simulated Message Inbox below.`);
    setMobile(norm);
    setIsSendingOtp(false);
    setStep(1.5);
  };

  // Step 1.5: Resend OTP
  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    const norm = normalizeIndianMobile(mobile);
    if (!norm) return;

    const otpResult = store.generateMobileOtp(norm, 'APPLICATION');
    if (!otpResult.success) {
      setErrorMsg(otpResult.error || "Failed to resend OTP.");
      return;
    }

    setResendCooldown(15);
    setInfoMsg(`A fresh OTP has been sent via SMS to +91 ${norm}.`);
  };

  // Step 1.5: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const norm = normalizeIndianMobile(mobile);
    if (!norm) {
      setErrorMsg("Invalid mobile number.");
      return;
    }

    const result = store.verifyMobileOtp(norm, otpInput);
    if (!result.success) {
      setErrorMsg(result.error || "Invalid OTP code.");
      return;
    }

    setVerifiedMobile(norm);
    setFormData(prev => ({ ...prev, mobile: norm }));
    setInfoMsg(null);
    setStep(2);
  };

  // Step 2: Personal Details
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.applicant_name?.trim()) {
      setErrorMsg("Please enter Full Name of Applicant as per age proof document.");
      return;
    }

    if (!formData.dob?.trim()) {
      setErrorMsg("Please enter Date of Birth (DD/MM/YYYY).");
      return;
    }

    const age = calculateAge(formData.dob);
    if (age < MIN_AGE) {
      setErrorMsg(`Applicant must be at least ${MIN_AGE} years of age to be eligible for the pension scheme. Current calculated age: ${age} years.`);
      return;
    }

    if (!formData.gender) {
      setErrorMsg("Please select gender.");
      return;
    }

    if (!formData.marital_status) {
      setErrorMsg("Please select marital status.");
      return;
    }

    if (formData.marital_status === "Widowed") {
      if (!formData.husband_name?.trim()) {
        setErrorMsg("Deceased Husband's Name is required for widowed applicants.");
        return;
      }
    }

    if (!formData.mobile?.trim() || !/^\d{10}$/.test(formData.mobile.trim())) {
      setErrorMsg("A valid 10-digit contact mobile number is required.");
      return;
    }

    setStep(3);
  };

  // Dependent Block -> Village Dropdown logic
  const loadVillagesForBlock = async (selectedBlock: string) => {
    if (!selectedBlock) {
      setAvailableVillages([]);
      setVillageSelection('');
      setManualVillageInput('');
      setIsLoadingVillages(false);
      setVillageLoadError(null);
      return;
    }

    activeBlockReqRef.current = selectedBlock;
    setIsLoadingVillages(true);
    setVillageLoadError(null);

    try {
      const res = await fetch(`/api/blocks/${encodeURIComponent(selectedBlock)}/villages`);
      if (!res.ok) {
        throw new Error(`Failed to load villages for block ${selectedBlock}`);
      }
      const data = await res.json();

      if (activeBlockReqRef.current === selectedBlock) {
        const list: string[] = data.villages || [];
        setAvailableVillages(list);
        setIsLoadingVillages(false);

        if (formData.village) {
          if (list.includes(formData.village)) {
            setVillageSelection(formData.village);
            setManualVillageInput('');
          } else {
            setVillageSelection('OTHER');
            setManualVillageInput(formData.village);
          }
        }
      }
    } catch {
      // Offline fallback to store mappings
      if (activeBlockReqRef.current === selectedBlock) {
        const fallbackList = store.getVillagesForBlock(selectedBlock);
        if (fallbackList && fallbackList.length > 0) {
          setAvailableVillages(fallbackList);
          setIsLoadingVillages(false);
          if (formData.village) {
            if (fallbackList.includes(formData.village)) {
              setVillageSelection(formData.village);
              setManualVillageInput('');
            } else {
              setVillageSelection('OTHER');
              setManualVillageInput(formData.village);
            }
          }
        } else {
          setIsLoadingVillages(false);
          setVillageLoadError('Unable to load villages. Please try again.');
        }
      }
    }
  };

  const handleBlockSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBlock = e.target.value;
    setErrorMsg(null);

    // Step 5: Clear previous village selection & manual input when block changes
    setFormData(prev => ({ ...prev, block: newBlock, village: '' }));
    setVillageSelection('');
    setManualVillageInput('');
    setAvailableVillages([]);

    loadVillagesForBlock(newBlock);
  };

  const handleVillageSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setErrorMsg(null);
    setVillageSelection(val);

    if (val === 'OTHER') {
      setFormData(prev => ({ ...prev, village: manualVillageInput.trim() }));
    } else {
      setManualVillageInput('');
      setFormData(prev => ({ ...prev, village: val }));
    }
  };

  const handleManualVillageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setErrorMsg(null);
    setManualVillageInput(raw);
    setFormData(prev => ({ ...prev, village: raw }));
  };

  const handleRetryLoadVillages = () => {
    if (formData.block) {
      loadVillagesForBlock(formData.block);
    }
  };

  useEffect(() => {
    if (step === 3 && formData.block) {
      if (availableVillages.length === 0 || activeBlockReqRef.current !== formData.block) {
        loadVillagesForBlock(formData.block);
      } else if (formData.village) {
        // Restore village state when navigating back and forward
        if (availableVillages.includes(formData.village)) {
          setVillageSelection(formData.village);
          setManualVillageInput('');
        } else {
          setVillageSelection('OTHER');
          setManualVillageInput(formData.village);
        }
      }
    }
  }, [step, formData.block, availableVillages]);

  // Step 3: Address Details Submit & Validation
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.block || !store.getSupportedBlocks().includes(formData.block)) {
      setErrorMsg("Please select a supported Development Block.");
      return;
    }

    if (isLoadingVillages) {
      setErrorMsg("Please wait until villages finish loading.");
      return;
    }

    if (villageLoadError) {
      setErrorMsg("Unable to load villages. Please click 'Retry' to load the village list.");
      return;
    }

    if (!villageSelection) {
      setErrorMsg("Please select a Village / Town from the list or select 'Other (enter manually)'.");
      return;
    }

    if (villageSelection === 'OTHER') {
      const cleanManual = manualVillageInput.trim();
      if (!cleanManual) {
        setErrorMsg("Please enter your village, town, or ward name.");
        return;
      }
      if (cleanManual.length < 2) {
        setErrorMsg("Village, town, or ward name must be at least 2 characters.");
        return;
      }
      setFormData(prev => ({ ...prev, village: cleanManual }));
    } else {
      const mapped = store.getVillagesForBlock(formData.block);
      if (!mapped.includes(villageSelection)) {
        setErrorMsg(`Selected village '${villageSelection}' does not belong to Development Block '${formData.block}'. Please select a valid village.`);
        return;
      }
      setFormData(prev => ({ ...prev, village: villageSelection }));
    }

    setStep(4);
  };

  // Step 4: Bank Details
  const handleStep4Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.bank_account?.trim()) {
      setErrorMsg("Bank Account Number is required for Direct Benefit Transfer (DBT).");
      return;
    }

    if (!/^\d{9,18}$/.test(formData.bank_account.trim())) {
      setErrorMsg("Bank Account Number must be between 9 and 18 numeric digits.");
      return;
    }

    if (!formData.ifsc?.trim()) {
      setErrorMsg("IFSC Code is required.");
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifsc.trim())) {
      setErrorMsg("Please enter a valid 11-character IFSC code (e.g., SBIN0001234).");
      return;
    }

    setStep(5);
  };

  // Step 5: Document Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size exceeds 5 MB limit. Please select a smaller photo or document.");
      return;
    }

    const name = file.name.toLowerCase();
    const isValidType = name.endsWith('.pdf') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');
    if (!isValidType) {
      setErrorMsg("Accepted formats are JPG, JPEG, PNG or PDF only.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        doc_name: file.name,
        doc_size: file.size,
        doc_data: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleStep5Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.doc_name) {
      setErrorMsg("Please upload your age proof document (JPG or PDF, max 5 MB).");
      return;
    }

    // Go to Review Screen (Step 6)
    setStep(6);
  };

  // Step 6 -> Step 7: Proceed to Declaration
  const handleProceedToDeclaration = () => {
    setStep(7);
  };

  // Step 7: Final Submission
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!declarationAgreed) {
      setErrorMsg("You must accept the statutory declaration before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const result = store.createApplication(verifiedMobile, formData);
      if (!result.success || !result.application) {
        setErrorMsg(result.error || "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }

      onSuccess(result.application.application_no, result.application.id);
    } catch (err: any) {
      setErrorMsg("An error occurred during submission: " + err.message);
      setSubmitting(false);
    }
  };

  const quickFillOtp = () => {
    const latest = store.getLatestOtpForMobile(mobile);
    if (latest) {
      setOtpInput(latest.code);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pre-flight Checklist Banner on Step 1 */}
      {step === 1 && (
        <div className="w-full bg-blue-50/80 border-l-4 border-[#0b3d6e] p-4 sm:p-5 rounded-r-lg shadow-2xs mb-6">
          <div className="flex items-center gap-2 font-bold text-[#0b3d6e] text-sm sm:text-base mb-2">
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span>{t.preflightTitle}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 mb-2.5 leading-relaxed">{t.preflightDesc}</p>
          <ul className="text-xs sm:text-sm text-slate-700 space-y-1.5 pl-5 list-disc leading-relaxed">
            <li>Active Indian Mobile Number for SMS OTP verification</li>
            <li>{t.needAgeProof}</li>
            <li>{t.needBank}</li>
          </ul>
        </div>
      )}

      {/* Step Indicator with Progress Bar */}
      <div className="w-full mb-6 sm:mb-8">
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 mb-2 font-medium">
          <span>
            <b>{t.stepIndicator} {step === 1.5 ? '1' : step} of 7:</b>{' '}
            {(step === 1 || step === 1.5) && t.stepMobileTitle}
            {step === 2 && t.stepPersonalTitle}
            {step === 3 && t.stepAddressTitle}
            {step === 4 && t.stepBankTitle}
            {step === 5 && t.stepUploadTitle}
            {step === 6 && t.stepReviewTitle}
            {step === 7 && t.stepDeclarationTitle}
          </span>
          {verifiedMobile && (
            <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-xs">
              Verified: +91 {verifiedMobile}
            </span>
          )}
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-[#e9ecef] h-[14px] rounded-full overflow-hidden">
          <div
            className="bg-[#0b3d6e] h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${((step === 1.5 ? 1 : step) / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div role="alert" className="flash-msg flex items-start gap-2.5 text-xs sm:text-sm mb-6">
          <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {infoMsg && (
        <div role="status" className="success-msg flex items-start gap-2.5 text-xs sm:text-sm mb-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1">{infoMsg}</div>
        </div>
      )}

      {/* STEP 1: Mobile & Captcha */}
      {step === 1 && (
        <div className="w-full max-w-xl space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0b3d6e] flex items-center gap-2.5 mb-2">
              <Phone className="w-6 h-6 text-[#0b3d6e]" />
              <span>Mobile Number Verification</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Enter your 10-digit Indian mobile number. You will receive an official SMS containing a 6-digit OTP code to verify your identity.
            </p>
          </div>

          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label htmlFor="mobileInput" className="block text-sm font-bold text-slate-800 mb-2">
                Indian Mobile Number
              </label>
              <div className="flex items-center w-full h-12 rounded-lg border border-slate-300 focus-within:border-[#0b3d6e] focus-within:ring-2 focus-within:ring-[#0b3d6e]/20 overflow-hidden bg-white shadow-2xs transition-all">
                <span className="bg-slate-100 px-4 text-slate-700 font-bold text-base flex items-center border-r border-slate-300 select-none h-full shrink-0">
                  +91
                </span>
                <input
                  id="mobileInput"
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 text-base font-mono focus:outline-none bg-white text-slate-900 tracking-wider h-full"
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Must be an active 10-digit mobile number starting with 6, 7, 8, or 9.
              </p>
            </div>

            <div className="w-full bg-slate-50 border border-slate-200/90 p-4 sm:p-5 rounded-lg space-y-3 shadow-2xs">
              <label htmlFor="captchaInput" className="block text-sm font-bold text-slate-800">
                Security Check: What is {captchaQuestion.a} + {captchaQuestion.b}?
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="captchaInput"
                  type="text"
                  placeholder="Answer"
                  value={captchaAnswer}
                  onChange={e => setCaptchaAnswer(e.target.value)}
                  className="w-36 h-11 px-3 border border-slate-300 rounded-md text-base text-center font-bold focus:outline-none focus:border-[#0b3d6e] focus:ring-2 focus:ring-[#0b3d6e]/20 bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={generateNewCaptcha}
                  className="text-xs text-blue-700 underline cursor-pointer hover:text-blue-900 font-medium"
                >
                  Change question
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSendingOtp}
                className="btn-gov h-12 px-8 text-base font-bold rounded-lg shadow-2xs hover:shadow-xs transition-all w-full sm:w-auto"
              >
                {isSendingOtp ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending OTP...</span>
                  </span>
                ) : (
                  <span>Send OTP to Mobile</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 1.5: Mobile OTP Input */}
      {step === 1.5 && (
        <div className="w-full max-w-xl space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0b3d6e] flex items-center gap-2.5 mb-2">
              <Phone className="w-6 h-6 text-[#0b3d6e]" />
              <span>Enter Mobile OTP Verification Code</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              A 6-digit OTP code has been dispatched via SMS to <b>+91 {mobile}</b>. Code is valid for 5 minutes.
            </p>
          </div>

          {/* Light Blue Demo OTP Callout Banner matching Sewa Setu reference design */}
          <div className="bg-[#e8f2fc] border-l-4 border-[#0b3d6e] p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 rounded-r flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-4">
            <div>
              <b>Student Demo OTP (current session only):</b> Your verification OTP is{' '}
              <span className="font-bold font-mono text-[#0b3d6e] text-base px-1">
                {store.getLatestOtpForMobile(mobile)?.code || '123456'}
              </span>{' '}
              (Valid for 5 minutes).
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={quickFillOtp}
                className="bg-[#0b3d6e] hover:bg-[#082a4d] text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto-Fill OTP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const btn = document.querySelector('button[title*="Message Inbox"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }}
                className="bg-white border border-[#0b3d6e]/30 text-[#0b3d6e] hover:bg-blue-50 px-2.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Open Simulated Message Inbox"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#0b3d6e]" />
                <span className="hidden sm:inline">Inbox</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label htmlFor="otpInput" className="block text-sm font-bold text-slate-800 mb-2">
                6-Digit OTP Code
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  id="otpInput"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="h-14 w-52 p-3 border-2 border-[#0b3d6e] rounded-lg text-2xl tracking-widest font-mono text-center font-bold focus:ring-4 focus:ring-blue-100 outline-none bg-white shadow-2xs"
                  required
                  autoFocus
                />
                <span className="text-xs text-slate-500 italic">
                  Maximum 5 verification attempts allowed.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="submit" className="btn-gov h-12 px-8 text-base font-bold rounded-lg shadow-xs hover:shadow transition-all">
                Verify &amp; Continue
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className={`h-12 text-xs px-4 rounded-lg font-semibold border transition-all ${
                  resendCooldown > 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50 cursor-pointer shadow-2xs'
                }`}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  generateNewCaptcha();
                }}
                className="text-xs text-slate-600 hover:underline cursor-pointer sm:ml-auto font-medium"
              >
                Change Mobile Number
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Personal Details */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#0b3d6e]">{t.stepPersonalTitle}</h2>
          <form onSubmit={handleStep2Submit} className="space-y-4 max-w-[500px]">
            <div>
              <label htmlFor="applicantName" className="block text-sm font-bold text-slate-800 mb-1">
                {t.fullNameLabel}
              </label>
              <input
                id="applicantName"
                type="text"
                value={formData.applicant_name}
                onChange={e => setFormData({ ...formData, applicant_name: e.target.value })}
                className="w-full p-2 border border-[#aab] rounded text-base"
                placeholder="e.g. Ramesh Chandra Das / रामेश्वर प्रसाद"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter your exact name in English, Hindi, or Assamese as it appears on your Aadhaar card.
              </p>
            </div>

            <div>
              <label htmlFor="dobInput" className="block text-sm font-bold text-slate-800 mb-1">
                {t.dobLabel}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="dobInput"
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full p-2 border border-[#aab] rounded text-base"
                  required
                />
                {calculatedAge !== null && (
                  <span
                    className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 border ${
                      calculatedAge >= MIN_AGE
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}
                  >
                    {t.calculatedAge}: {calculatedAge} yrs (
                    {calculatedAge >= MIN_AGE ? t.eligibleBadge : t.ineligibleBadge})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Must be at least 60 years old (born on or before {new Date().getFullYear() - 60}).
              </p>
            </div>

            <div>
              <label htmlFor="genderSelect" className="block text-sm font-bold text-slate-800 mb-1">
                {t.genderLabel}
              </label>
              <select
                id="genderSelect"
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className="w-full p-2 border border-[#aab] rounded text-base bg-white"
                required
              >
                <option value="">--Select--</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="maritalSelect" className="block text-sm font-bold text-slate-800 mb-1">
                {t.maritalLabel}
              </label>
              <select
                id="maritalSelect"
                value={formData.marital_status}
                onChange={e => {
                  const status = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    marital_status: status,
                    is_widow: status === 'Widowed' ? 'Yes' : 'No'
                  }));
                }}
                className="w-full p-2 border border-[#aab] rounded text-base bg-white"
                required
              >
                <option value="">--Select--</option>
                <option value="Married">Married</option>
                <option value="Unmarried">Unmarried</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div>
              <label htmlFor="widowSelect" className="block text-sm font-bold text-slate-800 mb-1">
                Is Applicant a Widow / Widower? *
              </label>
              <select
                id="widowSelect"
                value={formData.is_widow || (formData.marital_status === 'Widowed' ? 'Yes' : 'No')}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    is_widow: val,
                    marital_status: val === 'Yes' ? 'Widowed' : (prev.marital_status === 'Widowed' ? 'Unmarried' : prev.marital_status)
                  }));
                }}
                className="w-full p-2 border border-[#aab] rounded text-base bg-white"
                required
              >
                <option value="No">No</option>
                <option value="Yes">Yes (Widow / Widower)</option>
              </select>
            </div>

            {(formData.is_widow === 'Yes' || formData.marital_status === 'Widowed') && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded space-y-3">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Additional Details for Widowed Pension Applicants:</span>
                </div>
                <div>
                  <label htmlFor="husbandName" className="block text-xs font-bold text-slate-800 mb-1">
                    Deceased Husband's / Spouse's Full Name (as per Aadhaar) *
                  </label>
                  <input
                    id="husbandName"
                    type="text"
                    value={formData.husband_name}
                    onChange={e => setFormData({ ...formData, husband_name: e.target.value })}
                    className="w-full p-2 border border-[#aab] rounded text-sm bg-white"
                    placeholder="Late Husband's / Spouse's Full Name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="husbandEmployer" className="block text-xs font-bold text-slate-800 mb-1">
                    Husband's / Spouse's Past Employer / Occupation <span className="font-normal text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="husbandEmployer"
                    type="text"
                    value={formData.husband_employer}
                    onChange={e => setFormData({ ...formData, husband_employer: e.target.value })}
                    className="w-full p-2 border border-[#aab] rounded text-sm bg-white"
                    placeholder="e.g. Agriculture, Tea Estate, Self-Employed (if known)"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Verified Mobile Number (Application Identifier)
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-mono text-base">
                <span className="font-bold text-slate-500">+91</span>
                <span className="font-bold text-slate-900 tracking-wider">{verifiedMobile || formData.mobile}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Check className="w-3.5 h-3.5" /> Verified via SMS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                This mobile number is bound to your pension record for application status tracking and DBT notifications.
              </p>
            </div>

            <div>
              <label htmlFor="emailContact" className="block text-sm font-bold text-slate-800 mb-1">
                Email Address <span className="font-normal text-slate-500">(Optional - for digital notifications)</span>
              </label>
              <input
                id="emailContact"
                type="email"
                placeholder="name@example.com"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border border-[#aab] rounded text-base focus:outline-none focus:border-[#0b3d6e]"
              />
            </div>

            <div className="pt-2">
              <button type="submit" className="btn-gov">
                {t.saveContinue}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: Address Details */}
      {step === 3 && (
        <div className="w-full">
          <h2 className="text-[26px] sm:text-[34px] font-bold text-[#0b3d6e] mt-8 mb-7 leading-tight">
            {t.stepAddressTitle}
          </h2>

          <form onSubmit={handleStep3Submit} className="space-y-6 max-w-[630px] w-full">
            {/* Field 1: Development Block */}
            <div>
              <label htmlFor="blockSelect" className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                Development Block
              </label>
              <select
                id="blockSelect"
                value={formData.block}
                onChange={handleBlockSelectChange}
                className="w-full h-[50px] px-3.5 border border-[#aeb6c2] rounded-xs text-[18px] bg-white text-slate-900 focus:outline-none focus:border-[#0b3d6e] focus:ring-2 focus:ring-[#0b3d6e]/20 cursor-pointer"
                required
              >
                <option value="">-- Select Development Block --</option>
                {BLOCKS.map((b: string) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Field 2: Village / Town */}
            <div>
              <label htmlFor="villageSelect" className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                Village / Town
              </label>

              {villageLoadError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center justify-between gap-2 mb-2">
                  <span>{villageLoadError}</span>
                  <button
                    type="button"
                    onClick={handleRetryLoadVillages}
                    className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded font-bold cursor-pointer shrink-0"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              <select
                id="villageSelect"
                value={villageSelection}
                onChange={handleVillageSelectChange}
                disabled={!formData.block || isLoadingVillages || !!villageLoadError}
                className={`w-full h-[50px] px-3.5 border border-[#aeb6c2] rounded-xs text-[18px] bg-white text-slate-900 focus:outline-none focus:border-[#0b3d6e] focus:ring-2 focus:ring-[#0b3d6e]/20 ${
                  !formData.block || isLoadingVillages || !!villageLoadError
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
                required
              >
                {!formData.block ? (
                  <option value="">-- Select Village / Town --</option>
                ) : isLoadingVillages ? (
                  <option value="">Loading villages and towns...</option>
                ) : villageLoadError ? (
                  <option value="">Unable to load villages. Please try again.</option>
                ) : (
                  <>
                    <option value="">-- Select Village / Town --</option>
                    {availableVillages.map((v: string) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                    <option value="OTHER">Other (enter manually)</option>
                  </>
                )}
              </select>

              {/* Required helper text immediately below dropdown */}
              <p className="text-sm sm:text-[15px] text-[#64748b] mt-2 leading-relaxed">
                Select your development block to load its mapped villages/towns from the scheme directory. If your village is not in the project seed list, select Other (enter manually).
              </p>
            </div>

            {/* Manual entry field when 'OTHER' is selected */}
            {villageSelection === 'OTHER' && (
              <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-2">
                <label htmlFor="manualVillageInput" className="block text-sm sm:text-base font-bold text-slate-800">
                  Enter Village / Town Name
                </label>
                <input
                  id="manualVillageInput"
                  type="text"
                  value={manualVillageInput}
                  onChange={handleManualVillageInputChange}
                  placeholder="Enter your village, town, or ward name"
                  className="w-full h-[50px] px-3.5 border border-[#aeb6c2] rounded-xs text-[18px] bg-white text-slate-900 focus:outline-none focus:border-[#0b3d6e] focus:ring-2 focus:ring-[#0b3d6e]/20"
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-[56px] px-6 border border-[#aeb6c2] rounded-xs text-base font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                &laquo; {t.backButton}
              </button>
              <button
                type="submit"
                className="h-[56px] px-[30px] bg-[#0b3d6e] hover:bg-[#082a4d] active:bg-[#06203a] text-white text-[20px] font-bold rounded-xs transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
              >
                {t.saveContinue}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 4: Bank Details */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#0b3d6e]">{t.stepBankTitle}</h2>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-900 flex items-start gap-2">
            <Landmark className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <b>Direct Benefit Transfer (DBT) Guarantee:</b> Your monthly pension of ₹250 will be transferred directly to this bank account. Ensure the account belongs to the applicant.
            </div>
          </div>

          <form onSubmit={handleStep4Submit} className="space-y-4 max-w-[500px]">
            <div>
              <label htmlFor="bankAccount" className="block text-sm font-bold text-slate-800 mb-1">
                {t.bankAccountLabel}
              </label>
              <input
                id="bankAccount"
                type="text"
                value={formData.bank_account}
                onChange={e => setFormData({ ...formData, bank_account: e.target.value.replace(/\s+/g, '') })}
                className="w-full p-2 border border-[#aab] rounded text-base font-mono"
                placeholder="9 to 18 digit account number"
                required
              />
            </div>

            <div>
              <label htmlFor="ifscCode" className="block text-sm font-bold text-slate-800 mb-1">
                {t.ifscLabel}
              </label>
              <input
                id="ifscCode"
                type="text"
                value={formData.ifsc}
                onChange={e => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                className="w-full p-2 border border-[#aab] rounded text-base font-mono"
                placeholder="e.g. SBIN0001234"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                11-character bank code printed on the first page of your bank passbook.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                &laquo; {t.backButton}
              </button>
              <button type="submit" className="btn-gov">
                {t.saveContinue}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 5: Document Upload */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#0b3d6e]">{t.stepUploadTitle}</h2>
          <p className="note-text">
            Accepted documents: <b>Voter ID card, Birth certificate, or School leaving certificate</b>.<br />
            Accepted formats: <b>JPG, JPEG, PNG, or PDF</b> (maximum size <b>5 MB</b>).
          </p>

          <form onSubmit={handleStep5Submit} className="space-y-4 max-w-[500px]">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <label htmlFor="docUpload" className="block text-sm font-bold text-slate-800 mb-1 cursor-pointer">
                {t.uploadDocLabel}
              </label>
              <input
                id="docUpload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="text-xs text-slate-600 cursor-pointer mt-2"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Smartphone camera photos (JPG) and scanned copies (PDF) are accepted.
              </p>
            </div>

            {formData.doc_name && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Selected: <b>{formData.doc_name}</b>{' '}
                    {formData.doc_size ? `(${(formData.doc_size / 1024).toFixed(1)} KB)` : ''}
                  </span>
                </div>
                <span className="text-emerald-700 font-bold text-[11px]">Ready</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                &laquo; {t.backButton}
              </button>
              <button type="submit" className="btn-gov">
                {t.saveContinue}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 6: Review Screen (Essential for Persona 1 Elderly Citizen & Persona 2 Family Helper) */}
      {step === 6 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-xl font-bold text-[#0b3d6e]">{t.reviewTitle}</h2>
              <p className="text-xs text-slate-600 mt-0.5">{t.reviewNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowFullAccount(!showFullAccount)}
              className="text-xs text-[#0b3d6e] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              title="Toggle masked bank account"
            >
              {showFullAccount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showFullAccount ? 'Mask Account' : 'Show Full Account'}</span>
            </button>
          </div>

          {/* Cards for each section with Edit button */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Personal Details Card */}
            <div className="border border-slate-200 rounded p-3.5 bg-slate-50/70 space-y-1.5 relative">
              <div className="flex items-center justify-between font-bold text-slate-800 text-sm border-b pb-1">
                <span>Personal Information</span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-blue-700 hover:underline flex items-center gap-1 text-xs cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
              <div><span className="text-slate-500">Applicant:</span> <b>{formData.applicant_name}</b></div>
              <div><span className="text-slate-500">Verified Mobile:</span> <b>+91 {verifiedMobile || formData.mobile}</b></div>
              {formData.email && (
                <div><span className="text-slate-500">Contact Email:</span> <b>{formData.email}</b></div>
              )}
              <div><span className="text-slate-500">Date of Birth:</span> <b>{formData.dob}</b> ({calculatedAge} years)</div>
              <div><span className="text-slate-500">Gender:</span> <b>{formData.gender}</b></div>
              <div><span className="text-slate-500">Marital Status:</span> <b>{formData.marital_status}</b></div>
              {formData.husband_name && (
                <div><span className="text-slate-500">Husband's Name:</span> <b>{formData.husband_name}</b></div>
              )}
            </div>

            {/* Address Details Card */}
            <div className="border border-slate-200 rounded p-3.5 bg-slate-50/70 space-y-1.5 relative">
              <div className="flex items-center justify-between font-bold text-slate-800 text-sm border-b pb-1">
                <span>Address Details</span>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-blue-700 hover:underline flex items-center gap-1 text-xs cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
              <div><span className="text-slate-500">Development Block:</span> <b>{formData.block}</b></div>
              <div><span className="text-slate-500">Village / Town:</span> <b>{formData.village}</b></div>
            </div>

            {/* Bank (DBT) Details Card */}
            <div className="border border-slate-200 rounded p-3.5 bg-slate-50/70 space-y-1.5 relative">
              <div className="flex items-center justify-between font-bold text-slate-800 text-sm border-b pb-1">
                <span>Bank (DBT) Details</span>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-blue-700 hover:underline flex items-center gap-1 text-xs cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
              <div>
                <span className="text-slate-500">Bank Account:</span>{' '}
                <b className="font-mono">
                  {showFullAccount ? formData.bank_account : getMaskedAccount(formData.bank_account)}
                </b>
              </div>
              <div><span className="text-slate-500">IFSC Code:</span> <b className="font-mono">{formData.ifsc}</b></div>
              <div><span className="text-slate-500">Proof Document:</span> <b>{formData.doc_name}</b></div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>All required eligibility criteria satisfied: Age is 60+ and location is within Purvanchal.</span>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              &laquo; {t.backButton}
            </button>
            <button
              type="button"
              onClick={handleProceedToDeclaration}
              className="btn-gov"
            >
              <span>Confirm &amp; Proceed to Declaration</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: Statutory Declaration */}
      {step === 7 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#0b3d6e]">{t.stepDeclarationTitle}</h2>
          <div className="bg-slate-50 border border-slate-300 p-4 rounded text-sm text-slate-800 leading-relaxed">
            I hereby declare that the information furnished above is true to the best of my knowledge and belief.
            I understand that furnishing false information is punishable under applicable law and will result in
            cancellation of the pension and recovery of disbursed amounts.
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-slate-800 font-semibold cursor-pointer p-3 bg-blue-50/50 border border-blue-200 rounded">
              <input
                type="checkbox"
                checked={declarationAgreed}
                onChange={e => setDeclarationAgreed(e.target.checked)}
                className="w-5 h-5 rounded text-[#0b3d6e] accent-[#0b3d6e] cursor-pointer"
                required
              />
              <span>I agree to the above statutory declaration and submit this official application.</span>
            </label>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(6)}
                className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                &laquo; Back to Review
              </button>
              <button
                type="submit"
                disabled={submitting || !declarationAgreed}
                className="btn-gov text-base px-6 py-2.5"
              >
                {submitting ? 'Submitting Application...' : t.submitApplication}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
