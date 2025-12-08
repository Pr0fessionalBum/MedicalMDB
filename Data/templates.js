// Modular templates for fast, highly-varied clinical note and prescription generation
// Designed to be fast (pure JS) and highly combinatorial by composing small building blocks.

// Small building blocks
const openings = [
  'Routine follow-up visit.',
  'Follow-up for chronic condition management.',
  'Established patient visit for medication management.',
  'Acute care visit for symptom review.',
  'Scheduled follow-up to assess treatment response.'
];

const ccPhrases = [
  'Patient reports no new complaints.',
  'Patient reports mild intermittent symptoms.',
  'Patient reports improvement since last visit.',
  'Patient reports persistent symptoms despite therapy.',
  'Patient reports occasional side effects.'
];

const findings = [
  'Vital signs stable. Physical exam unremarkable.',
  'BP within target range. Heart and lungs clear.',
  'No peripheral edema. Cardiac exam normal.',
  'Respiratory exam notable for mild wheeze.',
  'Localized tenderness without erythema.'
];

const medEffect = [
  'Medication well tolerated.',
  'Patient reports occasional GI upset.',
  'No adverse effects reported.',
  'Patient notes mild dizziness initially, now resolved.',
  'Therapy adherence reported as good.'
];

const planActions = [
  'Continue current medication.',
  'Increase dose as tolerated.',
  'Add adjunctive therapy for symptom control.',
  'Obtain labs to monitor therapy.',
  'Provide a 90-day refill and schedule follow-up.'
];

const followups = [
  'Return in 3 months for routine follow-up.',
  'Return PRN for worsening symptoms.',
  'Recheck labs in 6-8 weeks.',
  'Follow-up by phone in 2 weeks to review results.',
  'Specialist referral if no improvement.'
];

const prescriptionPhrases = [
  'Take ${dosage} by mouth',
  'Apply ${dosage} topically',
  'Use ${dosage} inhalation',
  'Administer ${dosage} subcutaneously',
  'Take ${dosage} chewable'
];

export const frequencyPhrases = [
  'once daily', 'twice daily', 'three times daily', 'at bedtime', 'every 8 hours', 'as needed'
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
];
