const fs = require('fs');
const filePath = 'src/app/(rider)/(tabs)/index.js';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(
  "onPress: () => router.push({ pathname: '/(rider)/nearby', params: { type: 'food' } }),",
  "onPress: () => router.push('/(rider)/food'),"
);
content = content.replace(
  "onPress={() => router.push({ pathname: '/(rider)/nearby', params: { type: 'food' } })}",
  "onPress={() => router.push('/(rider)/food')}"
);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated index.js food navigation!');
