import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = 'src/environments';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const envConfigFile = `export const environment = {
  production: true,
  geminiApiKey: '${process.env.NG_APP_GEMINI_API_KEY || 'AIzaSyD6nyYBQVzTv_wV1me4g_cXaC-TdlieviY'}'
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
