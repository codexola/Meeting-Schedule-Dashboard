const FAILED = [
  "JOB_APPLICATION_FAILED",
  "CASUAL_INTERVIEW_FAIL",
  "DOCUMENT_SCREENING_FAIL",
  "FIRST_INTERVIEW_FAIL",
  "SECOND_INTERVIEW_FAIL",
];

const HIRING = [
  "DOCUMENT_SCREENING_SUBMITTED",
  "DOCUMENT_SCREENING_PASS",
  "FIRST_INTERVIEW_SCHEDULED",
  "FIRST_INTERVIEW_PASS",
  "SECOND_INTERVIEW_SCHEDULED",
  "SECOND_INTERVIEW_PASS",
];

function getMeetingHighlight(jobCondition, jobStatus) {
  if (jobCondition === "REJECT" || FAILED.includes(jobStatus)) return "reject";
  if (HIRING.includes(jobStatus)) return "hiring";
  return "default";
}

const cases = [
  ["REJECT", "CASUAL_INTERVIEW_PASS", "reject"],
  ["OK", "CASUAL_INTERVIEW_FAIL", "reject"],
  ["OK", "FIRST_INTERVIEW_SCHEDULED", "hiring"],
  ["OK", "SECOND_INTERVIEW_PASS", "hiring"],
  ["OK", "CASUAL_INTERVIEW_PASS", "default"],
  ["OK", "JOB_APPLICATION_RECEIVED", "default"],
];

let failed = 0;
for (const [condition, status, expected] of cases) {
  const actual = getMeetingHighlight(condition, status);
  if (actual !== expected) {
    console.error(`FAIL: ${condition}/${status} => ${actual}, expected ${expected}`);
    failed++;
  } else {
    console.log(`PASS: ${condition}/${status} => ${actual}`);
  }
}

if (failed > 0) process.exit(1);
console.log("All highlight tests passed");
