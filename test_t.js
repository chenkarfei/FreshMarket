const fs = require('fs');
const content = fs.readFileSync('contexts/LanguageContext.tsx', 'utf8');
const match = content.match(/export const translations: Translations = (\{[\s\S]*?\n\});/);
if (match) {
  const translationsStr = match[1];
  const translations = eval('(' + translationsStr + ')');
  const language = 'zh';
  const t = (key) => {
    if (!key) return '';
    const trimmedKey = key.trim();
    if (translations[trimmedKey]) {
      return translations[trimmedKey][language] || translations[trimmedKey]['en'];
    }
    const lowerKey = trimmedKey.toLowerCase();
    const foundKey = Object.keys(translations).find(k => k.toLowerCase() === lowerKey);
    if (foundKey) {
      return translations[foundKey][language] || translations[foundKey]['en'];
    }
    return key;
  };
  console.log("Garlic:", t("Garlic"));
  console.log("KG:", t("KG"));
  console.log("kg:", t("kg"));
}
