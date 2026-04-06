import { en } from './src/translations/en';
import { de } from './src/translations/de';
import { ar } from './src/translations/ar';

function compareKeys(source: any, target: any, targetName: string, path = '') {
  let missing = 0;
  for (const key in source) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) {
        console.log(`Missing object in ${targetName}: ${currentPath}`);
        missing++;
      } else {
        missing += compareKeys(source[key], target[key], targetName, currentPath);
      }
    } else {
      if (target[key] === undefined) {
        console.log(`Missing key in ${targetName}: ${currentPath}`);
        missing++;
      } else if (target[key] === source[key] && targetName !== 'en' && targetName !== 'ar') {
        // Warning if DE translation is exactly the same as EN
        // console.log(`Potential untranslated key in ${targetName}: ${currentPath} ("${source[key]}")`);
      }
    }
  }
  return missing;
}

console.log('Comparing English against German...');
const missingDe = compareKeys(en, de, 'de');
console.log(`Total missing in DE: ${missingDe}\n`);

console.log('Comparing English against Arabic...');
const missingAr = compareKeys(en, ar, 'ar');
console.log(`Total missing in AR: ${missingAr}\n`);
