// NLP extraction for service requests.
// Contract: 01_SHARED_BRIEF.md section 8.
// T19 adds the Gemini path above the fallback. The fallback must always work.

const { GoogleGenerativeAI } = require('@google/generative-ai');

const VALID_SKILLS = ['plumbing', 'electrical', 'cleaning', 'carpentry', 'appliance_repair', 'painting'];
const VALID_URGENCY = ['low', 'normal', 'high', 'emergency'];

// Keywords in English, Hindi and Gujarati. Lowercased before matching.
const SKILL_KEYWORDS = {
  plumbing: ['plumb', 'tap', 'faucet', 'leak', 'pipe', 'drain', 'toilet', 'flush', 'basin', 'water',
             'नल', 'पाइप', 'लीक', 'टपक', 'पानी', 'नली', 'शौचालय',
             'નળ', 'પાઇપ', 'લીક', 'ટપક', 'પાણી'],
  electrical: ['electric', 'wiring', 'fan', 'light', 'bulb', 'switch', 'socket', 'short circuit', 'mcb', 'power',
               'बिजली', 'पंखा', 'लाइट', 'बल्ब', 'स्विच', 'तार', 'करंट',
               'વીજળી', 'પંખો', 'લાઇટ', 'બલ્બ', 'સ્વિચ', 'લાઈટ'],
  cleaning: ['clean', 'sweep', 'mop', 'dust', 'housekeeping', 'maid', 'wash', 'bathroom clean', 'deep clean',
             'सफाई', 'साफ', 'झाड़ू', 'पोछा', 'धुलाई',
             'સફાઈ', 'સાફ', 'ઝાડુ', 'પોતું'],
  carpentry: ['carpent', 'wood', 'door', 'furniture', 'cupboard', 'hinge', 'drawer', 'table', 'chair',
              'बढ़ई', 'लकड़ी', 'दरवाजा', 'अलमारी', 'फर्नीचर',
              'સુથાર', 'લાકડું', 'દરવાજો', 'કબાટ', 'ફર્નિચર'],
  appliance_repair: ['fridge', 'refrigerator', 'washing machine', 'ac ', 'air conditioner', 'microwave',
                     'geyser', 'oven', 'tv', 'appliance', 'cooler',
                     'फ्रिज', 'वॉशिंग', 'एसी', 'गीजर', 'माइक्रोवेव',
                     'ફ્રિજ', 'વોશિંગ', 'એસી', 'ગીઝર'],
  painting: ['paint', 'whitewash', 'wall colour', 'wall color', 'putty', 'distemper',
             'पेंट', 'रंग', 'सफेदी', 'दीवार',
             'પેઇન્ટ', 'રંગ', 'દીવાલ'],
};

const URGENCY_KEYWORDS = {
  emergency: ['emergency', 'urgent immediately', 'flooding', 'sparking', 'fire', 'danger',
              'तुरंत', 'आपातकाल', 'खतरा', 'તાત્કાલિક', 'કટોકટી'],
  high: ['urgent', 'asap', 'today', 'right now', 'immediately', 'quickly', 'soon',
         'जल्दी', 'आज', 'अभी', 'जरूरी', 'આજે', 'જલ્દી', 'તરત'],
  low: ['whenever', 'no hurry', 'next week', 'sometime', 'not urgent',
        'कभी भी', 'जल्दी नहीं', 'ક્યારેય પણ'],
};

/** Crude script detection: Devanagari -> hi, Gujarati -> gu, otherwise en. */
function detectLanguage(text) {
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

function extractWithFallback(rawText) {
  const text = String(rawText).toLowerCase();

  let bestSkill = null;
  let bestHits = 0;
  for (const [code, words] of Object.entries(SKILL_KEYWORDS)) {
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits > bestHits) { bestHits = hits; bestSkill = code; }
  }

  let urgency = 'normal';
  for (const level of ['emergency', 'high', 'low']) {
    if (URGENCY_KEYWORDS[level].some((w) => text.includes(w))) { urgency = level; break; }
  }

  const skill_code = bestSkill || 'cleaning'; // documented default, see brief section 8
  const summary = String(rawText).trim().slice(0, 60);

  return {
    skill_code,
    issue_summary: summary,
    urgency,
    detected_language: detectLanguage(String(rawText)),
    confidence: 0.40,
    source: 'fallback',
  };
}

const LLM_TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = `You classify household service requests for an Indian cooperative platform.

The user message may be in English, Hindi or Gujarati.

Return ONLY a JSON object. No markdown, no code fences, no explanation.

Schema:
{
  "skill_code": one of ["plumbing","electrical","cleaning","carpentry","appliance_repair","painting"],
  "issue_summary": a short English summary, maximum 60 characters, even if the input is not English,
  "urgency": one of ["low","normal","high","emergency"],
  "detected_language": one of ["en","hi","gu"],
  "confidence": a number between 0 and 1
}

Urgency guidance:
- emergency: flooding, sparking wires, gas smell, anything dangerous right now
- high: the user says today, urgent, immediately, as soon as possible
- normal: no timing mentioned
- low: the user says whenever, no hurry, next week

Pick the single closest skill_code. Never invent a new one.`;

/** Strips ```json fences if the model adds them despite instructions. */
function stripFences(text) {
  return String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
}

/** Returns a validated object, or null if anything is wrong. */
function validateLlmOutput(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (!VALID_SKILLS.includes(parsed.skill_code)) return null;
  if (!VALID_URGENCY.includes(parsed.urgency)) return null;
  if (!['en', 'hi', 'gu'].includes(parsed.detected_language)) return null;

  let confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.8;
  confidence = Math.min(1, Math.max(0, confidence));

  const summary = String(parsed.issue_summary || '').trim().slice(0, 60);
  if (summary.length === 0) return null;

  return {
    skill_code: parsed.skill_code,
    issue_summary: summary,
    urgency: parsed.urgency,
    detected_language: parsed.detected_language,
    confidence: Number(confidence.toFixed(2)),
    source: 'llm',
  };
}

async function extractWithLlm(rawText) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  });

  // Hard timeout: the demo must never hang waiting for a network call.
  const call = model.generateContent(String(rawText));
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('LLM timeout')), LLM_TIMEOUT_MS)
  );

  const result = await Promise.race([call, timeout]);
  const text = stripFences(result.response.text());
  return validateLlmOutput(JSON.parse(text));
}

/**
 * Single entry point. Tries the LLM, falls back to keywords on ANY problem.
 * Never throws: intake must not fail because of NLP.
 */
async function extractServiceDetails(rawText) {
  const enabled = process.env.LLM_ENABLED === 'true' && !!process.env.GEMINI_API_KEY;
  if (!enabled) return extractWithFallback(rawText);

  try {
    const result = await extractWithLlm(rawText);
    if (result) return result;
    console.warn('LLM output failed validation; using keyword fallback.');
  } catch (err) {
    console.warn('LLM call failed (%s); using keyword fallback.', err.message);
  }
  return extractWithFallback(rawText);
}

module.exports = { extractServiceDetails, extractWithFallback, VALID_SKILLS, VALID_URGENCY };
