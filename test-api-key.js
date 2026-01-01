const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyAS6DXX-OmzwSQD-LOYLokvmdN4-0Z5qXU';

async function testAPI() {
    console.log('🔍 Testando API do Google Gemini...\n');

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('📖 Solicitando João 3:16...\n');

        const prompt = `Retorne o texto exato de João 3:16 na versão Almeida Revista e Atualizada (ARA).
    Formato JSON:
    {
      "verses": [
        {
          "number": 16,
          "text": "texto completo do versículo",
          "keywords": ["palavra1", "palavra2"],
          "crossRefs": ["Rm 5:8", "1Jo 4:9"]
        }
      ]
    }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('✅ Resposta recebida:');
        console.log(text);
        console.log('\n✅ API funcionando corretamente!');

    } catch (error) {
        console.error('❌ Erro ao testar API:', error.message);
        if (error.message.includes('API_KEY_INVALID')) {
            console.error('\n⚠️  A chave API parece estar inválida.');
            console.error('Verifique se você copiou a chave corretamente de: https://aistudio.google.com/app/apikey');
        }
    }
}

testAPI();
