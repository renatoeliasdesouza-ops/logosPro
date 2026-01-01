const fs = require('fs');
const path = require('path');

const dir = 'src/environments';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const envConfigFile = `export const environment = {
  production: true,
  geminiApiKey: '${process.env.NG_APP_GEMINI_API_KEY || ''}'
};
`;

const targetPath = path.join(__dirname, './src/environments/environment.ts');

fs.writeFile(targetPath, envConfigFile, function (err) {
    if (err) {
        throw console.error(err);
    } else {
        console.log(`Angular environment.ts file generated at ${targetPath} \n`);
    }
});
