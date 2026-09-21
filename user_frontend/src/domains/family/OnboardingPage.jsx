import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, ChevronLeft, Home, Users, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { familyService } from '../../services/familyService';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import styles from './OnboardingPage.module.css';

// ── Validation schemas per step ───────────────────────────────
const step1Schema = z.object({
  rationCardNumber: z.string().min(3, 'Ration card number is required'),
  rationCardType: z.enum(['AAY', 'PHH', 'NPHH', 'APL', 'None']),
  hasPuccaHouse: z.boolean(),
  village: z.string().min(2, 'Village is required'),
  taluka: z.string().min(2, 'Taluka is required'),
  district: z.string().min(2, 'District is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
});

const step2Schema = z.object({
  name: z.string().min(2, 'Full name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other']),
  relationToHead: z.literal('Self'),
  aadhaar: z.string().regex(/^\d{12}$/, 'Enter a valid 12-digit Aadhaar number'),
  occupation: z.string().default('Unemployed'),
  maritalStatus: z.enum(['Single', 'Married', 'Widow', 'Widower', 'Divorced']).default('Single'),
});

const step3Schema = z.object({
  annualIncome: z.coerce.number().min(0, 'Income must be a positive number'),
  category: z.enum(['SC', 'ST', 'OBC', 'General', 'EWS']),
  isBPL: z.boolean().default(false),
  familyType: z.enum(['Nuclear', 'Joint', 'SingleParent', 'SinglePerson']).default('Nuclear'),
  primaryLivelihood: z.enum(['Agriculture', 'Labour', 'Service', 'Business', 'SelfEmployed', 'Other']).default('Labour'),
  landHolding: z.coerce.number().min(0).default(0),
  dwellingType: z.enum(['Kutcha', 'SemiPucca', 'Pucca', 'Flat']).default('Pucca'),
  drinkingWaterSource: z.enum(['PipedTap', 'Well', 'HandPump', 'Tanker', 'Other']).default('PipedTap'),
  cookingFuel: z.enum(['LPG', 'Firewood', 'Kerosene', 'Electric', 'Other']).default('LPG'),
  toiletAvailable: z.boolean().default(true),
  electricityConnection: z.boolean().default(true),
  vehicleOwned: z.boolean().default(false),
});

const STEPS = [
  { id: 1, icon: Home,        label: 'Address',    desc: 'Where do you live?' },
  { id: 2, icon: Users,       label: 'Head',       desc: 'Head of family details' },
  { id: 3, icon: FileText,    label: 'Details',    desc: 'Income & social profile' },
  { id: 4, icon: ShieldCheck, label: 'Review',     desc: 'Confirm your information' },
  { id: 5, icon: Sparkles,    label: 'Done',       desc: 'Registration complete' },
];

function StepIndicator({ current }) {
  return (
    <div className={styles.stepIndicator} role="list" aria-label="Registration progress">
      {STEPS.map((step, idx) => {
        const state = current > step.id ? 'done' : current === step.id ? 'active' : 'upcoming';
        const Icon = step.icon;
        return (
          <div key={step.id} role="listitem" className={`${styles.stepItem} ${styles[`step_${state}`]}`}>
            <div className={styles.stepCircle} aria-current={state === 'active' ? 'step' : undefined}>
              {state === 'done' ? <Check size={14} /> : <Icon size={14} />}
            </div>
            <span className={styles.stepLabel}>{step.label}</span>
            {idx < STEPS.length - 1 && <div className={`${styles.stepLine} ${state === 'done' ? styles.stepLineDone : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Address ────────────────────────────────────────────
function Step1({ onNext, savedData }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: savedData || {},
  });
  return (
    <form onSubmit={handleSubmit(onNext)} className={styles.stepForm}>
      <div className={styles.stepHeader}>
        <h2>Family Address & Ration Card</h2>
        <p>Enter your permanent residential address in Gujarat</p>
      </div>
      <div className={styles.formGrid}>
        <Input label="Ration Card Number" required error={errors.rationCardNumber?.message} {...register('rationCardNumber')} />
        <div className={styles.field}>
          <label className={styles.label}>Ration Card Type <span className={styles.req}>*</span></label>
          <select className={styles.select} {...register('rationCardType')}>
            <option value="AAY">AAY (Antyodaya)</option>
            <option value="PHH">PHH (Priority Household)</option>
            <option value="NPHH">NPHH (Non-Priority)</option>
            <option value="APL">APL (Above Poverty Line)</option>
            <option value="None">None</option>
          </select>
        </div>
        <Input label="Village / Town" required error={errors.village?.message} {...register('village')} />
        <Input label="Taluka" required error={errors.taluka?.message} {...register('taluka')} />
        <Input label="District" required error={errors.district?.message} {...register('district')} />
        <Input label="Pincode" required inputMode="numeric" maxLength={6} error={errors.pincode?.message} {...register('pincode')} />
      </div>
      <div className={styles.checkboxRow}>
        <input type="checkbox" id="hasPuccaHouse" {...register('hasPuccaHouse')} />
        <label htmlFor="hasPuccaHouse">Family owns a Pucca (permanent) house</label>
      </div>
      <div className={styles.stepActions}>
        <Button type="submit" size="lg" variant="secondary" icon={<ChevronRight size={18} />} iconPosition="right">
          Continue
        </Button>
      </div>
    </form>
  );
}

// ── Step 2: Head of Family ─────────────────────────────────────
function Step2({ onNext, onBack, savedData }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: savedData || { relationToHead: 'Self' },
  });
  return (
    <form onSubmit={handleSubmit(onNext)} className={styles.stepForm}>
      <div className={styles.stepHeader}>
        <h2>Head of Family</h2>
        <p>Enter details of the primary member (you, the account holder)</p>
      </div>
      <div className={styles.formGrid}>
        <Input label="Full Name" required error={errors.name?.message} {...register('name')} className={styles.fullWidth} />
        <Input label="Date of Birth" type="date" required error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
        <div className={styles.field}>
          <label className={styles.label}>Gender <span className={styles.req}>*</span></label>
          <select className={styles.select} {...register('gender')}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <p className={styles.error}>{errors.gender.message}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Marital Status</label>
          <select className={styles.select} {...register('maritalStatus')}>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widow">Widow</option>
            <option value="Widower">Widower</option>
            <option value="Divorced">Divorced</option>
          </select>
        </div>
        <Input label="Aadhaar Number" type="password" required inputMode="numeric" maxLength={12} hint="12-digit Aadhaar — stored encrypted" error={errors.aadhaar?.message} {...register('aadhaar')} className={styles.fullWidth} />
        <Input label="Occupation" placeholder="e.g. Farmer, Daily Labour, Retired" {...register('occupation')} />
        <input type="hidden" value="Self" {...register('relationToHead')} />
      </div>
      <div className={styles.stepActions}>
        <Button type="button" variant="outline" size="lg" icon={<ChevronLeft size={18} />} onClick={onBack}>Back</Button>
        <Button type="submit" size="lg" variant="secondary" icon={<ChevronRight size={18} />} iconPosition="right">Continue</Button>
      </div>
    </form>
  );
}

// ── Step 3: Income & Social Profile ───────────────────────────
function Step3({ onNext, onBack, savedData }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: savedData || {},
  });
  return (
    <form onSubmit={handleSubmit(onNext)} className={styles.stepForm}>
      <div className={styles.stepHeader}>
        <h2>Income, Household & Socioeconomic Profile</h2>
        <p>This information determines your eligibility for welfare schemes across Gujarat</p>
      </div>
      <div className={styles.formGrid}>
        <Input label="Annual Family Income (₹)" type="number" min="0" required error={errors.annualIncome?.message} hint="Total income of all earning members per year" {...register('annualIncome')} />
        <div className={styles.field}>
          <label className={styles.label}>Social Category <span className={styles.req}>*</span></label>
          <select className={styles.select} {...register('category')}>
            <option value="General">General</option>
            <option value="OBC">OBC (Other Backward Class)</option>
            <option value="SC">SC (Scheduled Caste)</option>
            <option value="ST">ST (Scheduled Tribe)</option>
            <option value="EWS">EWS (Economically Weaker Section)</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Family Structure Type</label>
          <select className={styles.select} {...register('familyType')}>
            <option value="Nuclear">Nuclear Family</option>
            <option value="Joint">Joint Family</option>
            <option value="SingleParent">Single Parent</option>
            <option value="SinglePerson">Single Person</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Primary Livelihood</label>
          <select className={styles.select} {...register('primaryLivelihood')}>
            <option value="Agriculture">Agriculture / Farming</option>
            <option value="Labour">Daily Wage / Construction Labour</option>
            <option value="Service">Salaried Employment / Service</option>
            <option value="Business">Small Trade / Business</option>
            <option value="SelfEmployed">Artisan / Self-Employed</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <Input label="Land Holding (in Acres)" type="number" step="0.1" min="0" defaultValue={0} {...register('landHolding')} />
        <div className={styles.field}>
          <label className={styles.label}>Dwelling / House Type</label>
          <select className={styles.select} {...register('dwellingType')}>
            <option value="Pucca">Pucca (Permanent Brick/Concrete)</option>
            <option value="SemiPucca">Semi-Pucca (Tiled/Tin Roof)</option>
            <option value="Kutcha">Kutcha (Mud/Thatch)</option>
            <option value="Flat">Apartment / Flat</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Drinking Water Source</label>
          <select className={styles.select} {...register('drinkingWaterSource')}>
            <option value="PipedTap">Piped Tap Water</option>
            <option value="HandPump">Hand Pump / Borewell</option>
            <option value="Well">Open Well</option>
            <option value="Tanker">Water Tanker</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Primary Cooking Fuel</label>
          <select className={styles.select} {...register('cookingFuel')}>
            <option value="LPG">LPG / Piped Gas</option>
            <option value="Firewood">Firewood / Biomass</option>
            <option value="Kerosene">Kerosene</option>
            <option value="Electric">Electric Induction</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
        <div className={styles.checkboxRow}>
          <input type="checkbox" id="isBPL" {...register('isBPL')} />
          <label htmlFor="isBPL">Family holds a BPL Card</label>
        </div>
        <div className={styles.checkboxRow}>
          <input type="checkbox" id="toiletAvailable" {...register('toiletAvailable')} />
          <label htmlFor="toiletAvailable">Sanitary Toilet Available</label>
        </div>
        <div className={styles.checkboxRow}>
          <input type="checkbox" id="electricityConnection" {...register('electricityConnection')} />
          <label htmlFor="electricityConnection">Electricity Connected</label>
        </div>
        <div className={styles.checkboxRow}>
          <input type="checkbox" id="vehicleOwned" {...register('vehicleOwned')} />
          <label htmlFor="vehicleOwned">Motorized Vehicle Owned</label>
        </div>
      </div>
      <div className={styles.stepActions}>
        <Button type="button" variant="outline" size="lg" icon={<ChevronLeft size={18} />} onClick={onBack}>Back</Button>
        <Button type="submit" size="lg" variant="secondary" icon={<ChevronRight size={18} />} iconPosition="right">Review</Button>
      </div>
    </form>
  );
}

// ── Step 4: Review ─────────────────────────────────────────────
function Step4({ data, onBack, onSubmit, isSubmitting }) {
  return (
    <div className={styles.stepForm}>
      <div className={styles.stepHeader}>
        <h2>Review Your Information</h2>
        <p>Please check the details below before submitting</p>
      </div>

      <div className={styles.reviewSection}>
        <h3>Address & Dwelling</h3>
        <div className={styles.reviewGrid}>
          <div><span>Ration Card</span><strong>{data.step1?.rationCardNumber} ({data.step1?.rationCardType})</strong></div>
          <div><span>Village / Taluka</span><strong>{data.step1?.village}, {data.step1?.taluka}</strong></div>
          <div><span>District & Pincode</span><strong>{data.step1?.district} - {data.step1?.pincode}</strong></div>
          <div><span>Pucca House</span><strong>{data.step1?.hasPuccaHouse ? 'Yes' : 'No'}</strong></div>
        </div>
      </div>

      <div className={styles.reviewSection}>
        <h3>Head of Family</h3>
        <div className={styles.reviewGrid}>
          <div><span>Name</span><strong>{data.step2?.name}</strong></div>
          <div><span>Date of Birth</span><strong>{data.step2?.dateOfBirth}</strong></div>
          <div><span>Gender</span><strong>{data.step2?.gender}</strong></div>
          <div><span>Occupation</span><strong>{data.step2?.occupation || 'Unemployed'}</strong></div>
          <div><span>Aadhaar</span><strong>XXXX XXXX {data.step2?.aadhaar?.slice(-4)}</strong></div>
        </div>
      </div>

      <div className={styles.reviewSection}>
        <h3>Socioeconomic & Household Details</h3>
        <div className={styles.reviewGrid}>
          <div><span>Annual Income</span><strong>₹{Number(data.step3?.annualIncome || 0).toLocaleString('en-IN')}</strong></div>
          <div><span>Category</span><strong>{data.step3?.category}</strong></div>
          <div><span>BPL Status</span><strong>{data.step3?.isBPL ? 'Yes (BPL)' : 'No'}</strong></div>
          <div><span>Family Type</span><strong>{data.step3?.familyType || 'Nuclear'}</strong></div>
          <div><span>Primary Livelihood</span><strong>{data.step3?.primaryLivelihood || '—'}</strong></div>
          <div><span>Land Holding</span><strong>{data.step3?.landHolding || 0} acres</strong></div>
          <div><span>Dwelling</span><strong>{data.step3?.dwellingType || '—'}</strong></div>
          <div><span>Cooking Fuel</span><strong>{data.step3?.cookingFuel || '—'}</strong></div>
        </div>
      </div>

      <div className={styles.stepActions}>
        <Button type="button" variant="outline" size="lg" icon={<ChevronLeft size={18} />} onClick={onBack}>Back</Button>
        <Button size="lg" variant="primary" loading={isSubmitting} onClick={onSubmit}>
          Submit Registration
        </Button>
      </div>
    </div>
  );
}

// ── Step 5: Success ────────────────────────────────────────────
function Step5({ familyId, navigate }) {
  return (
    <div className={styles.successStep}>
      <div className={styles.successIcon}>
        <Check size={40} />
      </div>
      <h2>Family Registered!</h2>
      <p className={styles.successSub}>
        Your family has been registered with ID <strong>{familyId}</strong>.
        A Talati officer will verify your details and upgrade your status to{' '}
        <strong>Permanent</strong>.
      </p>
      <div className={styles.successInfo}>
        <div className={styles.successInfoItem}>
          <span className={styles.successInfoNum}>1</span>
          <span>Your family is now in <strong>Provisional</strong> status</span>
        </div>
        <div className={styles.successInfoItem}>
          <span className={styles.successInfoNum}>2</span>
          <span>A Talati will verify your details within a few working days</span>
        </div>
        <div className={styles.successInfoItem}>
          <span className={styles.successInfoNum}>3</span>
          <span>Once <strong>Permanent</strong>, you can apply for any scheme you qualify for</span>
        </div>
      </div>
      <Button size="lg" variant="secondary" onClick={() => navigate('/schemes')}>
        Explore Schemes
      </Button>
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateFamilyId } = useAuthStore();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ step1: null, step2: null, step3: null });
  const [registeredFamilyId, setRegisteredFamilyId] = useState(null);

  const { mutateAsync: registerFamily, isPending } = useMutation({
    mutationFn: familyService.register,
    onSuccess: (data) => {
      const fid = data?.familyId;
      setRegisteredFamilyId(fid);
      updateFamilyId(fid);
      queryClient.invalidateQueries({ queryKey: ['family'] });
    },
  });

  const handleStep1 = (data) => { setFormData((f) => ({ ...f, step1: data })); setStep(2); };
  const handleStep2 = (data) => { setFormData((f) => ({ ...f, step2: data })); setStep(3); };
  const handleStep3 = (data) => { setFormData((f) => ({ ...f, step3: data })); setStep(4); };

  const handleSubmit = async () => {
    const { step1, step2, step3 } = formData;
    const payload = {
      familyDetails: {
        rationCardNumber: step1.rationCardNumber,
        rationCardType:   step1.rationCardType,
        hasPuccaHouse:    step1.hasPuccaHouse || false,
        annualIncome:     Number(step3.annualIncome),
        category:         step3.category,
        isBPL:            step3.isBPL || false,
        familyType:       step3.familyType || 'Nuclear',
        socioeconomic: {
          primaryLivelihood: step3.primaryLivelihood || 'Labour',
          landHolding: Number(step3.landHolding || 0),
          isFarmer: step3.primaryLivelihood === 'Agriculture',
        },
        household: {
          dwellingType: step3.dwellingType || 'Pucca',
          drinkingWaterSource: step3.drinkingWaterSource || 'PipedTap',
          cookingFuel: step3.cookingFuel || 'LPG',
          toiletAvailable: step3.toiletAvailable ?? true,
          electricityConnection: step3.electricityConnection ?? true,
          vehicleOwned: step3.vehicleOwned ?? false,
        },
        address: {
          village: step1.village,
          taluka:  step1.taluka,
          district: step1.district,
          pincode:  step1.pincode,
          state:    'Gujarat',
        },
      },
      headMemberDetails: {
        name:           step2.name,
        dateOfBirth:    step2.dateOfBirth,
        gender:         step2.gender,
        relationToHead: 'Self',
        aadhaar:        step2.aadhaar,
        occupation:     step2.occupation || 'Unemployed',
        maritalStatus:  step2.maritalStatus || 'Single',
      },
    };
    await registerFamily(payload);
    setStep(5);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.wizardHeader}>
          <h1>Register Your Family</h1>
          <p>Complete this one-time registration to access government welfare schemes</p>
        </div>

        <StepIndicator current={step} />

        <div className={styles.wizardBody}>
          {step === 1 && <Step1 onNext={handleStep1} savedData={formData.step1} />}
          {step === 2 && <Step2 onNext={handleStep2} onBack={() => setStep(1)} savedData={formData.step2} />}
          {step === 3 && <Step3 onNext={handleStep3} onBack={() => setStep(2)} savedData={formData.step3} />}
          {step === 4 && <Step4 data={formData} onBack={() => setStep(3)} onSubmit={handleSubmit} isSubmitting={isPending} />}
          {step === 5 && <Step5 familyId={registeredFamilyId} navigate={navigate} />}
        </div>
      </div>
    </div>
  );
}
