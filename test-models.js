
import { GoogleGenAI } from '@google/genai';

async function list() {
    const apiKey = 'AIzaSyBCKYIeTPe1TTh5e51qmwWNyLDNiI1EXXo';
    const genAI = new GoogleGenAI({ apiKey });
    try {
        const models = await genAI.models.list();
        console.log(JSON.stringify(models, null, 2));
    } catch (e) {
        console.error(e);
    }
}

list();
