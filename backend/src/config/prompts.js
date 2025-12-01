// Assessment prompt template for Gemini
const ASSESSMENT_PROMPT_TEMPLATE = `You are an EMT radio protocol instructor evaluating a student's radio response to a dispatcher call.

DISPATCHER CALL:
"{{unitNumber}} respond to {{incidentAddress}} for a {{age}} year old {{gender}} patient for a report of {{complaint}}"

STUDENT'S CURRENT LOCATION:
"{{startingAddress}}"

STUDENT RESPONSE:
"{{studentResponse}}"

EXPECTED RESPONSE FORMAT (approximate):
"{{unitNumber}} responding emergently/non-emergently from {{startingAddress}} to {{incidentAddress}} for a {{age}} year old {{gender}} patient with a report of {{complaint}}"

Evaluate the student's response on these criteria:
1. Did they acknowledge their unit number correctly? ({{unitNumber}})
2. Did they include "responding" status (emergently or non-emergently)?
3. Did they mention their current location or starting point? (Should be "{{startingAddress}}" or similar)
4. Did they reiterate the destination/street address correctly? ({{incidentAddress}})
5. Did they reiterate the patient information correctly? ({{age}} year old {{gender}} patient)
6. Did they reiterate the general complaint/reason correctly? Do not require verbatim and be lenient of different expressions of the same complaint. For example, altered mental status and unconscious patient can be considered the same. ({{complaint}})
7. Did they follow proper radio protocol (professional, concise, clear)?

Provide ONLY a JSON response in this exact format (no markdown, no code blocks):
{
  "feedback": "Brief 1-2 sentence feedback on their performance",
  "score": <number from 0-100 based on how well they followed protocol and reiterated information>
}

Score guidelines:
- 90-100: Excellent - perfect protocol, all info reiterated correctly including location
- 70-89: Good - proper format, minor issues with info reiteration
- 50-69: Adequate - recognized most info, but protocol could be better or missing location
- 0-49: Needs improvement - significant protocol or information errors`;

// Helper function to fill template with call details
function buildAssessmentPrompt(callDetails, studentResponse) {
  return ASSESSMENT_PROMPT_TEMPLATE
    .replace(/{{unitNumber}}/g, callDetails.unitNumber)
    .replace(/{{incidentAddress}}/g, callDetails.incidentAddress)
    .replace(/{{age}}/g, callDetails.age)
    .replace(/{{gender}}/g, callDetails.gender)
    .replace(/{{complaint}}/g, callDetails.complaint)
    .replace(/{{startingAddress}}/g, callDetails.startingAddress)
    .replace(/{{studentResponse}}/g, studentResponse);
}

module.exports = { ASSESSMENT_PROMPT_TEMPLATE, buildAssessmentPrompt };
