/**
 * Heuristic recipe parser for Panagioti's Cooking
 * Parses recipe text using regex patterns
 */

// Quantity patterns
const QUANTITY_PATTERNS = [
    /^([\d.,\/½¼¾⅓⅔⅛]+)\s*/,
    /^(one|two|three|four|five|six|seven|eight|nine|ten)\s+/i,
    /^(ένα|δύο|τρία|τέσσερα|πέντε|έξι|επτά|οκτώ|εννέα|δέκα)\s+/i
];

// Word to number mapping
const WORD_TO_NUM = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'ένα': 1, 'δύο': 2, 'τρία': 3, 'τέσσερα': 4, 'πέντε': 5,
    'έξι': 6, 'επτά': 7, 'οκτώ': 8, 'εννέα': 9, 'δέκα': 10,
    '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.666, '⅛': 0.125
};

// Unit patterns
const UNIT_PATTERN = /^(g|gr|kg|oz|lb|lbs|ml|l|fl\s*oz|cup|cups|tbsp|tsp|tablespoon|teaspoon|γρ|κιλό|κιλά|λίτρο|λίτρα|κ\.σ\.|κ\.γ\.|φλιτζάνι|φλιτζάνια)\s*/i;

// Section headers
const INGREDIENT_HEADERS = [
    /^(ingredients?|υλικά|συστατικά)[:\s]*$/i
];

const INSTRUCTION_HEADERS = [
    /^(instructions?|directions?|method|steps?|preparation|εκτέλεση|οδηγίες|βήματα)[:\s]*$/i
];

const SERVINGS_PATTERN = /(\d+)\s*(servings?|portions?|μερίδες?|άτομα)/i;

// Parse quantity from string
function parseQuantity(str) {
    const cleaned = str.trim();

    // Check for fraction characters
    for (const [frac, num] of Object.entries(WORD_TO_NUM)) {
        if (cleaned.includes(frac)) {
            const parts = cleaned.split(frac);
            const whole = parts[0] ? parseFloat(parts[0]) || 0 : 0;
            return whole + num;
        }
    }

    // Check for slash fractions (e.g., 1/2)
    if (cleaned.includes('/')) {
        const match = cleaned.match(/(\d+)?\s*(\d+)\/(\d+)/);
        if (match) {
            const whole = match[1] ? parseInt(match[1]) : 0;
            const num = parseInt(match[2]);
            const den = parseInt(match[3]);
            return whole + (num / den);
        }
    }

    // Word numbers
    const lower = cleaned.toLowerCase();
    if (WORD_TO_NUM[lower] !== undefined) {
        return WORD_TO_NUM[lower];
    }

    // Regular number
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
}

// Parse a single ingredient line
function parseIngredientLine(line) {
    let remaining = line.trim();
    let quantity = null;
    let unit = null;
    let item = remaining;
    let notes = '';

    // Extract notes in parentheses
    const notesMatch = remaining.match(/\(([^)]+)\)/);
    if (notesMatch) {
        notes = notesMatch[1];
        remaining = remaining.replace(notesMatch[0], '').trim();
    }

    // Try to extract quantity
    for (const pattern of QUANTITY_PATTERNS) {
        const match = remaining.match(pattern);
        if (match) {
            quantity = parseQuantity(match[1]);
            remaining = remaining.slice(match[0].length).trim();
            break;
        }
    }

    // Try to extract unit
    const unitMatch = remaining.match(UNIT_PATTERN);
    if (unitMatch) {
        unit = normalizeUnit(unitMatch[1]) || unitMatch[1];
        remaining = remaining.slice(unitMatch[0].length).trim();
    }

    // Remaining is the item
    item = remaining.replace(/^(of|the|του|της|το)\s+/i, '').trim();

    // Remove leading punctuation like dashes or bullets
    item = item.replace(/^[-•*]\s*/, '');

    return {
        quantity,
        unit,
        item,
        notes
    };
}

// Detect if line is an ingredient
function isIngredientLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Starts with bullet or dash
    if (/^[-•*]/.test(trimmed)) return true;

    // Starts with number or quantity word
    for (const pattern of QUANTITY_PATTERNS) {
        if (pattern.test(trimmed)) return true;
    }

    return false;
}

// Detect if line is an instruction step
function isInstructionLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Starts with step number
    if (/^\d+[\.\)]\s/.test(trimmed)) return true;

    // Is a substantial sentence
    if (trimmed.length > 30 && /[.!]$/.test(trimmed)) return true;

    return false;
}

// Main parse function
function parseRecipe(text, sourceLang = 'auto') {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let title = '';
    let servings = 4; // default
    let ingredients = [];
    let instructions = [];
    let currentSection = 'unknown';

    // Detect language
    const detectedLang = sourceLang === 'auto' ? detectLanguage(text) : sourceLang;

    // Find servings
    for (const line of lines) {
        const servingsMatch = line.match(SERVINGS_PATTERN);
        if (servingsMatch) {
            servings = parseInt(servingsMatch[1]);
            break;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for section headers
        if (INGREDIENT_HEADERS.some(p => p.test(line))) {
            currentSection = 'ingredients';
            continue;
        }
        if (INSTRUCTION_HEADERS.some(p => p.test(line))) {
            currentSection = 'instructions';
            continue;
        }

        // First non-empty line is likely the title
        if (!title && i < 3 && line.length < 100) {
            // Remove servings info from title
            title = line.replace(SERVINGS_PATTERN, '').replace(/[()]/g, '').trim();
            continue;
        }

        // Parse based on section or heuristics
        if (currentSection === 'ingredients' || isIngredientLine(line)) {
            const parsed = parseIngredientLine(line);
            if (parsed.item) {
                ingredients.push(parsed);
            }
        } else if (currentSection === 'instructions' || isInstructionLine(line)) {
            // Clean up step numbers
            const step = line.replace(/^\d+[\.\)]\s*/, '').trim();
            if (step) {
                instructions.push(step);
            }
        }
    }

    // If no ingredients found, try to parse all lines that look like ingredients
    if (ingredients.length === 0) {
        for (const line of lines.slice(1)) { // Skip title
            if (!INGREDIENT_HEADERS.some(p => p.test(line)) &&
                !INSTRUCTION_HEADERS.some(p => p.test(line))) {
                const parsed = parseIngredientLine(line);
                if (parsed.quantity || parsed.item.length < 50) {
                    ingredients.push(parsed);
                }
            }
        }
    }

    return {
        title: title || 'Untitled Recipe',
        servings,
        originalLanguage: detectedLang,
        ingredients,
        instructions,
        source: '',
        originalText: text
    };
}
