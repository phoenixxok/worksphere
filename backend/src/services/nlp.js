// NLP extraction for service requests.
// Contract: 01_SHARED_BRIEF.md section 8.
// T19 adds the Gemini path above the fallback. The fallback must always work.

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

/**
 * Single entry point used by the routes. T19 adds the LLM branch here.
 * Always resolves — never throws — so intake cannot fail because of NLP.
 */
async function extractServiceDetails(rawText) {
  return extractWithFallback(rawText);
}

module.exports = { extractServiceDetails, extractWithFallback, VALID_SKILLS, VALID_URGENCY };
