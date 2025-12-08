// ---------------------------------------------
// RANDOM UTILITIES
// ---------------------------------------------
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function maybe(arr, probability = 0.3) {
  return Math.random() < probability ? pick(arr) : "";
}

// ---------------------------------------------
// TEMPLATE COMPONENT POOLS
// ---------------------------------------------

const subjectiveSymptoms = [
  "reports improvement in symptoms",
  "notes mild worsening over the past week",
  "denies fever, chills, or chest pain",
  "states medication provides moderate relief",
  "reports new onset headaches",
  "experiences increased fatigue recently",
  "notes intermittent dizziness",
  "reports good adherence to medication regimen",
  "denies shortness of breath or palpitations",
];

const subjectiveAddOns = [
  "No recent hospitalizations.",
  "No adverse drug reactions reported.",
  "Symptoms most prominent in the morning.",
  "Family history remains unchanged.",
  "Patient concerned about long-term prognosis.",
  "Requests refill today.",
  "Reports good tolerance overall.",
];

const objectiveVitals = [
  "BP stable",
  "Pulse regular",
  "Normal respiratory effort",
  "Afebrile",
  "Vitals within normal limits",
  "No acute distress observed",
];

const objectiveFindings = [
  "Lungs clear to auscultation",
  "Heart regular rhythm with no murmurs",
  "Abdomen soft, non-tender",
  "Extremities without edema",
  "No focal neurological deficits",
  "Skin warm and dry",
];

const objectiveAddOns = [
  "Lab results reviewed and stable.",
  "Imaging unchanged from prior exam.",
  "Weight stable since last visit.",
  "No new abnormalities detected.",
];

const assessmentTemplates = [
  "${age}-year-old ${gender} with ${dx} showing stable clinical status.",
  "Chronic ${dx} remains controlled with current therapy.",
  "Patient demonstrates good response to ${med} for ${dx}.",
  "${dx} well-managed at this time; no complications observed.",
  "Current visit shows improvement in ${dx} symptoms.",
  "No significant progression of ${dx}; continue monitoring.",
];

const planTemplates = [
  "Continue ${med} at current dose. Follow up in 3 months.",
  "Refill provided. Encourage lifestyle modifications. Repeat ${test} next visit.",
  "Monitor ${test} levels in 6 weeks. Discussed medication adherence.",
  "Patient educated on red-flag symptoms. Maintain current regimen.",
  "No change in therapy. Routine labs ordered today.",
  "Continue present treatment plan. Return sooner if symptoms worsen.",
];

const tests = ["BMP", "CBC", "A1C", "lipid panel", "TSH", "EKG", "UA"];

// ---------------------------------------------
// SECTION GENERATORS
// ---------------------------------------------

export function generateSubjective(age, gender, diagnosis, med) {
  return `
SUBJECTIVE:
${pick(subjectiveSymptoms)}.
${maybe(subjectiveAddOns)}
  `.trim();
}

export function generateObjective() {
  return `
OBJECTIVE:
${pick(objectiveVitals)}.
${pick(objectiveFindings)}.
${maybe(objectiveAddOns)}
  `.trim();
}

export function generateAssessment(age, gender, med, diagnosis) {
  return `
ASSESSMENT:
${pick(assessmentTemplates)
    .replace("${age}", age)
    .replace("${gender}", gender)
    .replace("${dx}", diagnosis.description)
    .replace("${med}", med)}
  `.trim();
}

export function generatePlan(med) {
  const t = pick(tests);
  return `
PLAN:
${pick(planTemplates)
    .replace("${med}", med)
    .replace("${test}", t)}
  `.trim();
}

// ---------------------------------------------
// FULL NOTE GENERATOR
// ---------------------------------------------
export function generateFullNote(age, gender, med, diagnosis) {
  return [
    generateSubjective(age, gender, diagnosis, med),
    generateObjective(),
    generateAssessment(age, gender, med, diagnosis),
    generatePlan(med)
  ].join("\n\n");
}
