# Backend Configuration Reference - Radio Simulation

This document contains all prompts, data pools, and configuration values extracted from RadioSimulation.tsx that should be moved to backend configuration files.

---

## 1. SCENARIO DATA POOLS

### Addresses Pool
```json
{
  "addresses": [
    "123 Main Street",
    "456 Oak Avenue",
    "789 Elm Drive",
    "321 Pine Road",
    "654 Maple Lane",
    "987 Cedar Boulevard"
  ]
}
```

### Complaints Pool
```json
{
  "complaints": [
    "chest pain",
    "difficulty breathing",
    "severe headache",
    "abdominal pain",
    "altered mental status",
    "minor laceration",
    "unconscious patient",
    "fall from height"
  ]
}
```

### Locations Pool (Current Station/Starting Locations)
```json
{
  "locations": [
    "Station 1",
    "Station 2",
    "Station 3",
    "Highway 101",
    "Downtown Station"
  ]
}
```

### Unit Number Range
```json
{
  "unitNumberRange": {
    "min": 1,
    "max": 20
  }
}
```

### Age Range
```json
{
  "ageRange": {
    "min": 18,
    "max": 78
  }
}
```

### Gender Options
```json
{
  "genderOptions": ["Male", "Female"]
}
```

---

## 2. VOICE CONFIGURATION

### ElevenLabs Voice IDs
```json
{
  "voices": {
    "dispatcher": {
      "voiceId": "21m00Tcm4TlvDq8ikWAM",
      "description": "Professional, authoritative dispatcher voice"
    }
  }
}
```

### TTS Settings
```json
{
  "ttsSettings": {
    "modelId": "eleven_turbo_v2_5",
    "voiceSettings": {
      "stability": 0.4,
      "similarityBoost": 0.75,
      "style": 0.35,
      "useSpeakerBoost": true
    }
  }
}
```

---

## 3. ASSESSMENT PROMPT TEMPLATE

### Gemini Assessment System Prompt
```text
You are an EMT radio protocol instructor evaluating a student's radio response to a dispatcher call.

DISPATCHER CALL:
"{{unitNumber}} respond to {{address}} for a {{age}} year old {{gender}} patient for a report of {{complaint}}"

STUDENT'S CURRENT LOCATION:
"{{currentLocation}}"

STUDENT RESPONSE:
"{{studentResponse}}"

EXPECTED RESPONSE FORMAT (approximate):
"{{unitNumber}} responding emergently/non-emergently from [current location] to {{address}} for a {{age}} year old {{gender}} patient with a report of {{complaint}}"

Evaluate the student's response on these criteria:
1. Did they acknowledge their unit number correctly? ({{unitNumber}})
2. Did they include "responding" status (emergently or non-emergently)?
3. Did they mention their current location or starting point? (Should be "{{currentLocation}}" or similar)
4. Did they reiterate the destination/street address correctly? ({{address}})
5. Did they reiterate the patient information correctly? ({{age}} year old {{gender}} patient)
6. Did they reiterate the general complaint/reason correctly? Do not require verbatim and be lenient of different expressions of the same complaint. For example, altered mental status and unconcious patient can be considered the same. ({{complaint}})
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
- 0-49: Needs improvement - significant protocol or information errors
```

**Template Variables:**
- `{{unitNumber}}` - The assigned unit number (e.g., "Unit 5")
- `{{address}}` - The incident address
- `{{age}}` - Patient age
- `{{gender}}` - Patient gender
- `{{complaint}}` - Chief complaint/reason for call
- `{{currentLocation}}` - Student's current station/location
- `{{studentResponse}}` - The actual transcribed student response

---

## 4. PROTOCOL REFERENCE TEXT

### Radio Protocol Format
```text
[Unit #] respond [emergently/non-emergently] from [current location] to [incident location] for a [p.t. info] for a report of [complaint].
```

---

## 5. DISPATCH TEXT TEMPLATE

### Dispatcher Call Format
```text
{{unitNumber}}, respond to {{address}} for a {{age}} year old {{gender}} patient for a report of {{complaint}}
```

---

## 6. SCORING RUBRIC

### Assessment Criteria Weights (Suggested)
```json
{
  "assessmentCriteria": [
    {
      "id": 1,
      "name": "Unit Number Acknowledgment",
      "weight": 15,
      "description": "Did they acknowledge their unit number correctly?"
    },
    {
      "id": 2,
      "name": "Response Status",
      "weight": 10,
      "description": "Did they include 'responding' status (emergently or non-emergently)?"
    },
    {
      "id": 3,
      "name": "Current Location",
      "weight": 15,
      "description": "Did they mention their current location or starting point?"
    },
    {
      "id": 4,
      "name": "Destination Address",
      "weight": 20,
      "description": "Did they reiterate the destination/street address correctly?"
    },
    {
      "id": 5,
      "name": "Patient Information",
      "weight": 20,
      "description": "Did they reiterate the patient age and gender correctly?"
    },
    {
      "id": 6,
      "name": "Chief Complaint",
      "weight": 15,
      "description": "Did they reiterate the general complaint/reason? Allow synonyms."
    },
    {
      "id": 7,
      "name": "Radio Protocol",
      "weight": 5,
      "description": "Did they follow proper radio protocol (professional, concise, clear)?"
    }
  ]
}
```

---

## 7. DIFFICULTY LEVELS (For Future Enhancement)

### Suggested Difficulty Configuration
```json
{
  "difficultyLevels": {
    "beginner": {
      "addressPool": ["123 Main Street", "456 Oak Avenue"],
      "complaintPool": ["chest pain", "minor laceration"],
      "ageRange": { "min": 30, "max": 50 },
      "strictness": "lenient"
    },
    "intermediate": {
      "addressPool": ["all"],
      "complaintPool": ["chest pain", "difficulty breathing", "severe headache", "abdominal pain"],
      "ageRange": { "min": 18, "max": 70 },
      "strictness": "moderate"
    },
    "advanced": {
      "addressPool": ["all"],
      "complaintPool": ["all"],
      "ageRange": { "min": 18, "max": 78 },
      "strictness": "strict"
    }
  }
}
```

---

## 8. API CONFIGURATION

### Model Configuration
```json
{
  "gemini": {
    "model": "gemini-2.5-flash",
    "temperature": 0.7,
    "maxTokens": 500
  },
  "elevenlabs": {
    "model": "eleven_turbo_v2_5",
    "outputFormat": "mp3_44100_128"
  }
}
```

---

## 9. COMPLAINT SYNONYMS (For Lenient Matching)

### Complaint Equivalence Map
```json
{
  "complaintSynonyms": {
    "altered mental status": ["unconscious patient", "unresponsive", "confused", "altered consciousness"],
    "difficulty breathing": ["shortness of breath", "SOB", "respiratory distress", "dyspnea"],
    "chest pain": ["cardiac event", "heart pain", "angina"],
    "abdominal pain": ["stomach pain", "belly pain", "GI distress"],
    "severe headache": ["head pain", "migraine", "cranial pain"],
    "fall from height": ["fall", "fell down", "ground level fall"]
  }
}
```

---

## IMPLEMENTATION NOTES

### Backend Files Structure Suggestion:
```
backend/
├── config/
│   ├── radio-simulation.config.json       # Main config (pools, ranges, voice IDs)
│   ├── assessment-prompts.json            # Prompt templates
│   ├── protocol-templates.json            # Protocol reference texts
│   ├── difficulty-levels.json             # Difficulty configurations
│   └── complaint-synonyms.json            # Synonym mappings for lenient eval
├── services/
│   ├── GeminiService.ts                   # Uses assessment-prompts.json
│   ├── ElevenLabsService.ts              # Uses voice configs
│   ├── ScenarioGeneratorService.ts       # Uses scenario pools
│   └── AssessmentService.ts              # Uses rubric and synonyms
```

### Environment Variables (Still needed):
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### Configurable vs Fixed:
- **Backend Config Files**: Scenario pools, voice settings, prompt templates, scoring rubric
- **Database (protocol_templates table)**: Custom instructor rubrics, modified prompts
- **Frontend**: User preferences (difficulty level selection)
- **Environment**: API keys, service endpoints

---

## MIGRATION CHECKLIST

- [ ] Create `radio-simulation.config.json` with scenario pools
- [ ] Create `assessment-prompts.json` with Gemini prompt template
- [ ] Create `complaint-synonyms.json` for lenient matching
- [ ] Create `ScenarioGeneratorService` using config pools
- [ ] Create `AssessmentService` using prompt template and synonyms
- [ ] Create REST endpoint: `POST /api/radio/generate-call`
- [ ] Create REST endpoint: `POST /api/radio/assess-response`
- [ ] Create REST endpoint: `GET /api/radio/audio/:callId`
- [ ] Update frontend to call backend instead of direct API calls
- [ ] Remove hardcoded pools/prompts from RadioSimulation.tsx
- [ ] Add admin UI for editing config (future enhancement)
