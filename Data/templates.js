// Modular templates for fast, highly-varied clinical note and prescription generation
// Designed to be fast (pure JS) and highly combinatorial by composing small building blocks.

// Small building blocks
const openings = [
  'Routine follow-up visit.',
  'Follow-up for chronic condition management.',
  'Established patient visit for medication management.',
  'Acute care visit for symptom review.',
  'Scheduled follow-up to assess treatment response.',
  'Preventive visit with emphasis on lifestyle counseling.',
  'Transitional care visit after recent hospitalization.',
  'Telehealth follow-up to review ongoing therapy.',
  'Pre-op evaluation for upcoming procedure.',
  'Walk-in visit for acute concern.',
  'Post-procedure check-in to review recovery.',
  'Annual wellness assessment.',
  'Medication reconciliation after discharge.',
  'Second opinion consultation.',
  'Return visit to review new diagnostics.',
  'Chronic disease check-in with goal review.',
  'Symptom flare visit with focused assessment.',
  'Lifestyle coaching follow-up.'
];

const ccPhrases = [
  'Patient reports no new complaints.',
  'Patient reports mild intermittent symptoms.',
  'Patient reports improvement since last visit.',
  'Patient reports persistent symptoms despite therapy.',
  'Patient reports occasional side effects.',
  'Patient notes gradual worsening over the past week.',
  'Patient reports excellent control with current regimen.',
  'Patient describes episodic flares triggered by activity.',
  'Patient reports stable status with no recent flares.',
  'Patient endorses new onset fatigue.',
  'Patient reports sleep disturbance affecting daytime function.',
  'Patient notes pain controlled with current plan.',
  'Patient reports limited exercise tolerance.',
  'Patient mentions dietary changes with some benefit.',
  'Patient reports dizziness on standing.',
  'Patient notes weight changes since last visit.',
  'Patient reports adherence challenges on weekends.',
  'Patient reports improved mood with current therapy.'
];

const findings = [
  'Vital signs stable. Physical exam unremarkable.',
  'BP within target range. Heart and lungs clear.',
  'No peripheral edema. Cardiac exam normal.',
  'Respiratory exam notable for mild wheeze.',
  'Localized tenderness without erythema.',
  'Mild edema in lower extremities, non-pitting.',
  'Neurologic exam grossly intact. No focal deficits.',
  'Skin exam shows no rashes or lesions.',
  'Abdomen soft, non-tender, normoactive bowel sounds.',
  'O2 saturation within normal limits on room air.',
  'Gait steady, no assistive device required.',
  'No cervical lymphadenopathy.',
  'Cardiac exam reveals regular rhythm, no murmurs.',
  'Lung fields clear to auscultation.',
  'No joint swelling or deformity noted.',
  'Mild tenderness over lumbar paraspinal muscles.',
  'No pedal edema; pulses intact.',
  'Cranial nerves II-XII grossly intact.'
];

const medEffect = [
  'Medication well tolerated.',
  'Patient reports occasional GI upset.',
  'No adverse effects reported.',
  'Patient notes mild dizziness initially, now resolved.',
  'Therapy adherence reported as good.',
  'Patient admits to occasional missed doses.',
  'Patient reports daytime fatigue possibly related to dose.',
  'No hypoglycemic events reported.',
  'Patient prefers to simplify dosing schedule.',
  'Patient reports mild headache since dose increase.',
  'Patient notes improved energy with current regimen.',
  'Patient reports dry mouth as a side effect.',
  'Patient denies any rash or swelling.',
  'Patient reports better symptom control at night.',
  'Patient notes GI upset improved with food intake.',
  'Patient prefers once-daily regimen for adherence.',
  'Patient reports no change in symptoms yet.',
  'Patient notes improved sleep with current therapy.'
];

const planActions = [
  'Continue current medication.',
  'Increase dose as tolerated.',
  'Add adjunctive therapy for symptom control.',
  'Obtain labs to monitor therapy.',
  'Provide a 90-day refill and schedule follow-up.',
  'Reinforce lifestyle modifications (diet, exercise, sleep).',
  'Switch to alternate agent due to side effects.',
  'Taper medication over the next 2 weeks.',
  'Refer to specialty clinic for co-management.',
  'Initiate trial of non-pharmacologic therapy.',
  'Order imaging to further evaluate symptoms.',
  'Adjust timing of dose to minimize side effects.',
  'Start rescue medication for breakthrough symptoms.',
  'Educate patient on warning signs and precautions.',
  'Provide written action plan for symptom flares.',
  'Review and update vaccination status.',
  'Address medication cost/coverage options.',
  'Add prophylactic agent for anticipated side effects.'
];

const followups = [
  'Return in 3 months for routine follow-up.',
  'Return PRN for worsening symptoms.',
  'Recheck labs in 6-8 weeks.',
  'Follow-up by phone in 2 weeks to review results.',
  'Specialist referral if no improvement.',
  'Schedule in-person visit in 4 weeks to reassess.',
  'Virtual follow-up in 1 week to evaluate tolerance.',
  'Return immediately if red-flag symptoms develop.',
  'Annual wellness visit to include screening updates.',
  'Follow-up after imaging is completed.',
  'Check in via portal message in 1 week.',
  'Nurse visit in 2 weeks for vitals and adherence check.',
  'Lab-only visit next month to review trends.',
  'Return in 6 months for chronic care management.',
  'Group visit option for lifestyle coaching.',
  'Follow-up with pharmacy consult in 2 weeks.',
  'Schedule tele-visit if symptoms persist beyond 48 hours.',
  'Next visit to include goal review and care plan update.'
];

const prescriptionPhrases = [
  'Take ${dosage} by mouth',
  'Apply ${dosage} topically',
  'Use ${dosage} inhalation',
  'Administer ${dosage} subcutaneously',
  'Take ${dosage} chewable',
  'Place ${dosage} under the tongue',
  'Instill ${dosage} drops as directed',
  'Take ${dosage} with meals',
  'Take ${dosage} on an empty stomach',
  'Dissolve ${dosage} in water and drink',
  'Inject ${dosage} intramuscularly',
  'Rinse mouth with ${dosage} solution and spit',
  'Apply ${dosage} to affected area twice daily',
  'Use ${dosage} via nebulizer as directed',
  'Swish and swallow ${dosage} suspension',
  'Take ${dosage} 30 minutes before breakfast',
  'Take ${dosage} at the first sign of symptoms',
  'Apply ${dosage} patch to clean, dry skin'
];

export const frequencyPhrases = [
  'once daily', 'twice daily', 'three times daily', 'at bedtime', 'every 8 hours', 'as needed',
  'every morning', 'every evening', 'every 12 hours', 'every 6 hours', 'every other day', 'once weekly',
  'every 4 hours', 'every 72 hours', 'every weekend', 'before strenuous activity', 'with each meal', 'every 2 hours as needed'
];

// Utility: choose random item
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build prescription instructions dynamically
export function generatePrescriptionInstructionsFromTemplate(dosage, medication = '') {
  const base = choice(prescriptionPhrases).replace('${dosage}', dosage);
  const freq = choice(frequencyPhrases);
  const precaution = Math.random() < 0.15 ? '. Avoid alcohol and monitor for side effects.' : '.';
  const medText = medication ? ` for ${medication}` : '';
  return `${base} ${freq}${medText}${precaution}`;
}

// Return both a nicely formatted instructions string and a selected frequency value.
export function generatePrescriptionWithFrequency(dosage, medication = '') {
  const freq = choice(frequencyPhrases);
  // instructions incorporate frequency for readability
  const instructions = generatePrescriptionInstructionsFromTemplate(dosage, medication);
  // Format frequency nicely (capitalize first letter)
  const pretty = freq.charAt(0).toUpperCase() + freq.slice(1);
  return { instructions, frequency: pretty };
}

// Build clinical note by composing modular parts for high combination count
export function generateClinicalNoteFromTemplate(age, gender, med, diagnosis) {
  const open = choice(openings);
  const cc = choice(ccPhrases);
  const find = choice(findings);
  const me = choice(medEffect);
  const action = choice(planActions);
  const follow = choice(followups);

  const assessment = `${age}-year-old ${gender} with ${diagnosis.description}. ${cc} ${find} ${me}`;
  const plan = `${action} ${follow} Medication: ${med}.`;
  return `ASSESSMENT:\n${assessment}\n\nPLAN:\n${plan}`;
}

// Export some additional helper generators for more modular outputs
export function generateShortAssessment(age, gender, diagnosis) {
  return `${age}-year-old ${gender} with ${diagnosis.description}. ${choice(ccPhrases)} ${choice(findings)}`;
}

export function generatePlanFragment(med) {
  return `${choice(planActions)} ${choice(followups)} Medication: ${med}.`;
}

// Diagnosis options (reusable)
export const diagnosisOptions = [
  { code: 'I10', description: 'Essential hypertension', chronic: true },
  { code: 'E11', description: 'Type 2 diabetes mellitus', chronic: true },
  { code: 'I50', description: 'Heart failure', chronic: true },
  { code: 'J45', description: 'Asthma', chronic: true },
  { code: 'E78', description: 'Hyperlipidemia', chronic: true },
  { code: 'M79.3', description: 'Myalgia', chronic: false },
  { code: 'J06', description: 'Acute upper respiratory infection', chronic: false },
  { code: 'M54.5', description: 'Low back pain', chronic: false },
  { code: 'E04', description: 'Thyroid disorder', chronic: true },
  { code: 'F41', description: 'Anxiety disorder', chronic: true },
  { code: 'M25.5', description: 'Joint pain (arthralgia)', chronic: true },
  { code: 'K21', description: 'Gastroesophageal reflux disease (GERD)', chronic: true },
  { code: 'F32', description: 'Major depressive disorder', chronic: true },
  { code: 'I25', description: 'Chronic ischemic heart disease', chronic: true },
  { code: 'E66', description: 'Obesity', chronic: true },
  { code: 'J44', description: 'Chronic obstructive pulmonary disease (COPD)', chronic: true },
  { code: 'M17', description: 'Osteoarthritis of knee', chronic: true },
  { code: 'E10', description: 'Type 1 diabetes mellitus', chronic: true },
  { code: 'G89', description: 'Pain, unspecified', chronic: false },
  { code: 'R06', description: 'Abnormalities of breathing', chronic: false },
  { code: 'N18', description: 'Chronic kidney disease', chronic: true },
  { code: 'L89', description: 'Pressure ulcer', chronic: false },
  { code: 'B34', description: 'Viral infection, unspecified', chronic: false },
  { code: 'R51', description: 'Headache', chronic: false },
  { code: 'J30', description: 'Allergic rhinitis', chronic: true },
  { code: 'E05', description: 'Hyperthyroidism', chronic: true },
  { code: 'I20', description: 'Angina pectoris', chronic: true },
  { code: 'M19', description: 'Osteoarthritis, unspecified', chronic: true },
  { code: 'F10', description: 'Alcohol use disorder', chronic: true },
  { code: 'G47', description: 'Sleep disorder', chronic: true },
  { code: 'K80', description: 'Cholelithiasis (gallstones)', chronic: true },
  { code: 'R50', description: 'Fever', chronic: false },
  { code: 'J12', description: 'Viral pneumonia', chronic: false },
  { code: 'E89', description: 'Postprocedural endocrine disorder', chronic: true },
  { code: 'I63', description: 'Cerebral infarction (stroke)', chronic: true },
  { code: 'R73', description: 'Impaired fasting glucose', chronic: false },
  { code: 'M81', description: 'Age-related osteoporosis', chronic: true },
  { code: 'D64', description: 'Anemia, unspecified', chronic: false },
  { code: 'K52', description: 'Gastroenteritis, noninfective', chronic: false },
  { code: 'H81', description: 'Vestibular disorders (vertigo)', chronic: false },
  { code: 'L40', description: 'Psoriasis', chronic: true },
  { code: 'N40', description: 'Benign prostatic hyperplasia', chronic: true },
  { code: 'E88', description: 'Metabolic syndrome', chronic: true },
  { code: 'F51', description: 'Insomnia', chronic: true },
  { code: 'J02', description: 'Acute pharyngitis', chronic: false },
  { code: 'H66', description: 'Otitis media', chronic: false },
  { code: 'M62', description: 'Muscle strain', chronic: false },
  { code: 'R19', description: 'Nausea and vomiting', chronic: false },
  { code: 'K59', description: 'Constipation', chronic: false },
  { code: 'N39', description: 'Urinary tract infection', chronic: false },
  { code: 'F43', description: 'Adjustment disorder', chronic: false },
  { code: 'E86', description: 'Volume depletion (dehydration)', chronic: false },
  { code: 'R63', description: 'Change in appetite or weight', chronic: false },
  { code: 'G44', description: 'Migraine', chronic: true }
];
