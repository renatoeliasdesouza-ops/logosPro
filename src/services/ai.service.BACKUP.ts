
import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({ providedIn: 'root' })
export class AIService {
    private apiKey = localStorage.getItem('gemini_api_key') || '';
    private genAI: GoogleGenerativeAI;
    private modelName = 'gemini-1.5-flash';

    constructor() {
        this.genAI = new GoogleGenerativeAI(this.apiKey || 'INSERT_YOUR_API_KEY_HERE');
    }

    updateApiKey(key: string) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        this.genAI = new GoogleGenerativeAI(key);
    }

    hasKey(): boolean {
        return !!this.apiKey && this.apiKey !== 'INSERT_YOUR_API_KEY_HERE';
    }

    private systemPrompt = `SYSTEM:
  Você é uma API de Bíblia de Alta Precisão e um Teólogo Erudito.
  Sua prioridade absoluta é a FIDELIDADE ao texto bíblico.
  Ao ser solicitado um capítulo, você deve fornecer o texto EXATO da versão pedida, versículo por versículo, sem pular nenhum.
  Jamais invente, resuma ou parafraseie o texto bíblico quando a solicitação for de leitura/consulta.
  Responda sempre em JSON válido quando solicitado.`;

    private libraryPrompt = `SYSTEM:
  Você é a "Biblioteca Bíblica Digital Logos Pro" (Nível Acadêmico/Seminário).
  Especialidade: Teologia Bíblica, História, Geografia, Arqueologia, Hermenêutica e Exegese.`;

    async suggestTheme(context: string): Promise<string[]> {
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: this.systemPrompt
        });
        const result = await model.generateContent(`Sugira 5 temas bíblicos impactantes baseados no seguinte contexto: "${context}". Retorne apenas os títulos separados por quebra de linha.`);
        const response = await result.response;
        return response.text().split('\n').filter(t => t.trim().length > 0);
    }

    async searchVerses(theme: string): Promise<any> {
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: this.systemPrompt,
            generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent(`Você é um analisador bíblico exaustivo. Busque cerca de 15 versículos fundamentais e diretamente relacionados ao tema: "${theme}".
      Certifique-se de cobrir diferentes aspectos do tema.
      
      Para CADA versículo, retorne estritamente este objeto JSON:
      {
        "ref": "Livro X:Y",
        "text": "Texto completo...",
        "explanation": "Uma breve exegese teológica de 1 ou 2 frases explicando a conexão com o tema.",
        "keywords": ["Palavra1", "Palavra2", "Palavra3"],
        "crossRefs": ["Ref1", "Ref2"]
      }

      Retorne um JSON com a chave "verses" contendo a lista.`);
        const response = await result.response;
        const text = response.text();
        return JSON.parse(this.cleanJson(text)).verses || JSON.parse(this.cleanJson(text));
    }

    async consultBible(version: string, book: string, chapter: string, verses: string): Promise<{ book: string, chapter: string, verses: any[] }> {
        const prompt = `ATUE COMO UMA API DE BÍBLIA DE ALTA PRECISÃO.
    
    SOLICITAÇÃO: Fornecer o texto bíblico COMPLETO e EXATO para:
    Livro: ${book}
    Capítulo: ${chapter}
    Versículos: ${verses && verses.trim() ? verses : 'TODOS (Capítulo completo)'}
    Versão: ${version}

    REGRAS INEGOCIÁVEIS:
    1. CORREÇÃO: Certifique-se de que o texto pertence ao livro e capítulo solicitados.
    2. INTEGRIDADE: Retorne TODOS os versículos do capítulo se nenhum intervalo específico for pedido.
    3. FIDELIDADE: Use o texto da versão ${version} o mais fielmente possível.
    4. FORMATO: Retorne APENAS o JSON abaixo.

    Estrutura JSON Obrigatória:
    {
      "verses": [
        {
          "number": 1,
          "text": "Texto completo do versículo...",
          "keywords": ["Palavra1", "Palavra2"],
          "crossRefs": ["Ref1", "Ref2"]
        }
      ]
    }`;

        try {
            const model = this.genAI.getGenerativeModel({
                model: this.modelName,
                systemInstruction: this.systemPrompt,
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const cleanText = this.cleanJson(text);
            const data = JSON.parse(cleanText);
            const versesList = data.verses || data;
            const sortedVerses = Array.isArray(versesList) ? versesList.sort((a: any, b: any) => a.number - b.number) : [];
            return { book, chapter, verses: sortedVerses };
        } catch (e) {
            console.error("Erro ao consultar Bíblia:", e);
            return { book, chapter, verses: [] };
        }
    }

    private cleanJson(text: string): string {
        if (!text) return '{}';
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        }
        return cleaned;
    }
}
