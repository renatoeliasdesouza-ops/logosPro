
import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
    const apiKey = 'AIzaSyBCKYIeTPe1TTh5e51qmwWNyLDNiI1EXXo';
    const genAI = new GoogleGenerativeAI(apiKey);
    const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-pro'];

    for (const modelName of models) {
        console.log(`Testing model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            const response = await result.response;
            console.log(`SUCCESS: Model ${modelName} works!`);
            console.log("Response:", response.text());
            return; // Exit after first success
        } catch (e) {
            console.log(`FAILED: Model ${modelName} - ${e.status || e.message}`);
        }
    }
    console.error("ALL MODELS FAILED.");
}

test();
