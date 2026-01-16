/**
 * Unit conversion module for Panagioti's Cooking
 * Supports Metric, US Customary, and Cooking units
 */

const UNIT_SYSTEMS = {
    METRIC: 'metric',
    US: 'us',
    COOKING: 'cooking'
};

// Unit definitions with conversion factors to base units (grams for weight, ml for volume)
const UNITS = {
    // Weight units
    g: { type: 'weight', base: 1, system: 'metric', name: 'grams' },
    kg: { type: 'weight', base: 1000, system: 'metric', name: 'kilograms' },
    oz: { type: 'weight', base: 28.3495, system: 'us', name: 'ounces' },
    lb: { type: 'weight', base: 453.592, system: 'us', name: 'pounds' },

    // Volume units
    ml: { type: 'volume', base: 1, system: 'metric', name: 'milliliters' },
    l: { type: 'volume', base: 1000, system: 'metric', name: 'liters' },
    'fl oz': { type: 'volume', base: 29.5735, system: 'us', name: 'fluid ounces' },
    cup: { type: 'volume', base: 236.588, system: 'cooking', name: 'cups' },
    cups: { type: 'volume', base: 236.588, system: 'cooking', name: 'cups' },
    tbsp: { type: 'volume', base: 14.7868, system: 'cooking', name: 'tablespoons' },
    tsp: { type: 'volume', base: 4.92892, system: 'cooking', name: 'teaspoons' },

    // Temperature (special handling)
    '°C': { type: 'temperature', system: 'metric', name: 'Celsius' },
    '°F': { type: 'temperature', system: 'us', name: 'Fahrenheit' },
    'C': { type: 'temperature', system: 'metric', name: 'Celsius' },
    'F': { type: 'temperature', system: 'us', name: 'Fahrenheit' }
};

// Unit aliases for parsing
const UNIT_ALIASES = {
    'gram': 'g', 'grams': 'g', 'gr': 'g', 'γρ': 'g', 'γραμμάρια': 'g',
    'kilogram': 'kg', 'kilograms': 'kg', 'κιλό': 'kg', 'κιλά': 'kg',
    'ounce': 'oz', 'ounces': 'oz',
    'pound': 'lb', 'pounds': 'lb', 'lbs': 'lb',
    'milliliter': 'ml', 'milliliters': 'ml', 'mls': 'ml',
    'liter': 'l', 'liters': 'l', 'litre': 'l', 'litres': 'l', 'λίτρο': 'l', 'λίτρα': 'l',
    'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',
    'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'κ.σ.': 'tbsp', 'κουταλιά σούπας': 'tbsp',
    'teaspoon': 'tsp', 'teaspoons': 'tsp', 'κ.γ.': 'tsp', 'κουταλάκι': 'tsp',
    'cup': 'cup', 'φλιτζάνι': 'cup', 'φλιτζάνια': 'cups',
    'celsius': '°C', 'βαθμούς': '°C',
    'fahrenheit': '°F'
};

// Preferred units for each system
const PREFERRED_UNITS = {
    metric: { weight: 'g', volume: 'ml', temperature: '°C' },
    us: { weight: 'oz', volume: 'fl oz', temperature: '°F' },
    cooking: { weight: 'oz', volume: 'cup', temperature: '°F' }
};

// Normalize unit string
function normalizeUnit(unit) {
    if (!unit) return null;
    const lower = unit.toLowerCase().trim();
    return UNIT_ALIASES[lower] || (UNITS[unit] ? unit : UNITS[lower] ? lower : null);
}

// Convert between units
function convert(value, fromUnit, toUnit) {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);

    if (!from || !to || !UNITS[from] || !UNITS[to]) {
        return null;
    }

    const fromDef = UNITS[from];
    const toDef = UNITS[to];

    // Must be same type
    if (fromDef.type !== toDef.type) {
        return null;
    }

    // Temperature needs special handling
    if (fromDef.type === 'temperature') {
        return convertTemperature(value, from, to);
    }

    // Convert to base unit, then to target
    const baseValue = value * fromDef.base;
    return baseValue / toDef.base;
}

// Temperature conversion
function convertTemperature(value, from, to) {
    const fromNorm = from.replace('°', '');
    const toNorm = to.replace('°', '');

    if (fromNorm === toNorm) return value;

    if (fromNorm === 'C' && toNorm === 'F') {
        return (value * 9 / 5) + 32;
    }
    if (fromNorm === 'F' && toNorm === 'C') {
        return (value - 32) * 5 / 9;
    }

    return value;
}

// Convert ingredient to a specific unit system
function convertIngredient(ingredient, targetSystem) {
    const { quantity, unit } = ingredient;

    // No unit = unitless item (e.g., "1 onion"), don't convert
    if (!unit || !quantity) {
        return { quantity, unit, converted: false };
    }

    const normalizedUnit = normalizeUnit(unit);
    if (!normalizedUnit || !UNITS[normalizedUnit]) {
        return { quantity, unit, converted: false };
    }

    const unitDef = UNITS[normalizedUnit];
    const targetUnit = PREFERRED_UNITS[targetSystem]?.[unitDef.type];

    if (!targetUnit || normalizedUnit === targetUnit) {
        return { quantity, unit: normalizedUnit, converted: false };
    }

    const convertedValue = convert(quantity, normalizedUnit, targetUnit);
    if (convertedValue === null) {
        return { quantity, unit: normalizedUnit, converted: false };
    }

    return {
        quantity: smartRound(convertedValue),
        unit: targetUnit,
        converted: true,
        originalQuantity: quantity,
        originalUnit: unit
    };
}

// Get all conversions for an ingredient
function getAllConversions(ingredient) {
    const result = {
        original: { quantity: ingredient.quantity, unit: ingredient.unit },
        metric: convertIngredient(ingredient, UNIT_SYSTEMS.METRIC),
        us: convertIngredient(ingredient, UNIT_SYSTEMS.US),
        cooking: convertIngredient(ingredient, UNIT_SYSTEMS.COOKING)
    };

    return result;
}

// Scale quantity by servings ratio
function scaleQuantity(quantity, baseServings, desiredServings) {
    if (!quantity || !baseServings || !desiredServings) return quantity;
    const ratio = desiredServings / baseServings;
    return smartRound(quantity * ratio);
}

// Format quantity with unit
function formatQuantityUnit(quantity, unit) {
    if (!quantity && quantity !== 0) return '';
    const q = typeof quantity === 'number' ? smartRound(quantity) : quantity;
    return unit ? `${q} ${unit}` : `${q}`;
}
