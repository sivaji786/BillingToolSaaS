const fs = require('fs');
const path = require('path');

// Read translation files
const enContent = fs.readFileSync(path.join(__dirname, 'src/translations/en.ts'), 'utf8');
const deContent = fs.readFileSync(path.join(__dirname, 'src/translations/de.ts'), 'utf8');
const arContent = fs.readFileSync(path.join(__dirname, 'src/translations/ar.ts'), 'utf8');

// Function to extract all keys from a translation object
function extractKeys(obj, prefix = '') {
    const keys = [];

    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys.push(...extractKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }

    return keys.sort();
}

// Evaluate the translation objects
const enModule = { exports: {} };
const deModule = { exports: {} };
const arModule = { exports: {} };

eval(enContent.replace('export const en =', 'module.exports.en ='));
eval(deContent.replace('export const de =', 'module.exports.de ='));
eval(arContent.replace('export const ar =', 'module.exports.ar ='));

const enKeys = extractKeys(enModule.exports.en);
const deKeys = extractKeys(deModule.exports.de);
const arKeys = extractKeys(arModule.exports.ar);

console.log('=== TRANSLATION KEYS ANALYSIS ===\n');
console.log(`Total keys in EN: ${enKeys.length}`);
console.log(`Total keys in DE: ${deKeys.length}`);
console.log(`Total keys in AR: ${arKeys.length}`);
console.log('');

// Find missing keys
const enSet = new Set(enKeys);
const deSet = new Set(deKeys);
const arSet = new Set(arKeys);

const missingInDE = enKeys.filter(k => !deSet.has(k));
const missingInAR = enKeys.filter(k => !arSet.has(k));
const extraInDE = deKeys.filter(k => !enSet.has(k));
const extraInAR = arKeys.filter(k => !enSet.has(k));

if (missingInDE.length > 0) {
    console.log('❌ Keys missing in DE (present in EN):');
    missingInDE.forEach(k => console.log(`  - ${k}`));
    console.log('');
}

if (missingInAR.length > 0) {
    console.log('❌ Keys missing in AR (present in EN):');
    missingInAR.forEach(k => console.log(`  - ${k}`));
    console.log('');
}

if (extraInDE.length > 0) {
    console.log('⚠️  Extra keys in DE (not in EN):');
    extraInDE.forEach(k => console.log(`  - ${k}`));
    console.log('');
}

if (extraInAR.length > 0) {
    console.log('⚠️  Extra keys in AR (not in EN):');
    extraInAR.forEach(k => console.log(`  - ${k}`));
    console.log('');
}

if (missingInDE.length === 0 && missingInAR.length === 0 && extraInDE.length === 0 && extraInAR.length === 0) {
    console.log('✅ All translation files have matching keys!');
    console.log('');
}

// Summary
console.log('=== SUMMARY ===');
console.log(`Missing in DE: ${missingInDE.length}`);
console.log(`Missing in AR: ${missingInAR.length}`);
console.log(`Extra in DE: ${extraInDE.length}`);
console.log(`Extra in AR: ${extraInAR.length}`);
