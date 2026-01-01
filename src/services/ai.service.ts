
import { Injectable } from '@angular/core';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

@Injectable({ providedIn: 'root' })
export class AIService {
  private apiKey = localStorage.getItem('gemini_api_key') || '';
  private genAI: GoogleGenerativeAI;
  private modelName = 'gemini-2.0-flash-exp';

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

  private getModel(systemInstruction?: string, jsonMode: boolean = false) {
    return this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction || this.systemPrompt,
      generationConfig: {
        responseMimeType: jsonMode ? 'application/json' : 'text/plain'
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
  }

  private systemPrompt = `SYSTEM:
  Você é uma API de Bíblia de Alta Precisão e um Teólogo Erudito.
  Sua prioridade absoluta é a FIDELIDADE ao texto bíblico.
  Ao ser solicitado um capítulo, você deve fornecer o texto EXATO da versão pedida, versículo por versículo, sem pular nenhum.
  Jamais invente, resuma ou parafraseie o texto bíblico quando a solicitação for de leitura/consulta.
  Responda sempre em JSON válido quando solicitado.`;

  // --- PROMPT DA BIBLIOTECA LOGOS PRO ---
  private libraryPrompt = `SYSTEM:
  Você é a "Biblioteca Bíblica Digital Logos Pro" (Nível Acadêmico/Seminário).
  Especialidade: Teologia Bíblica, História, Geografia, Arqueologia, Hermenêutica e Exegese.
  
  DIRETRIZES DE RESPOSTA:
  1. Nível: Acadêmico, profundo, porém claro para pastores e líderes.
  2. Estrutura: Use títulos claros, tópicos e parágrafos bem construídos.
  3. Conteúdo:
     - ESTUDOS: Contexto histórico, autoria, data, análise teológica.
     - GEOGRAFIA: Descreva rotas, relevo, distâncias e importância estratégica.
     - ARQUEOLOGIA: Cite descobertas, datas, museus onde estão artefatos.
     - HISTÓRIA: Imparcialidade académica ao tratar de denominações e movimentos.
  4. Formatação: NÃO use Markdown (negrito/itálico com asteriscos). Use CAIXA ALTA para títulos principais e hífens para listas.
  5. Objetivo: Ensinar, pesquisar e organizar conhecimento cristão avançado.
  `;

  async suggestTheme(context: string): Promise<string[]> {
    const model = this.getModel();
    const result = await model.generateContent(`Sugira 5 temas bíblicos impactantes baseados no seguinte contexto: "${context}". Retorne apenas os títulos separados por quebra de linha.`);
    const response = await result.response;
    return response.text().split('\n').filter(t => t.trim().length > 0);
  }

  async searchVerses(theme: string): Promise<any> {
    const model = this.getModel(this.systemPrompt, true);
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

  // --- NOVO: Expandir Contexto do Versículo Base ---
  async expandVerseContext(ref: string): Promise<any> {
    const model = this.getModel(this.systemPrompt, true);
    const result = await model.generateContent(`Analise o versículo referência: "${ref}".
      
      Retorne um JSON estrito com:
      1. "keywords": 5 palavras-chave teológicas principais deste texto.
      2. "crossRefs": 5 referências cruzadas que explicam este texto.
      3. "mainTheme": O tema central deste versículo em uma frase curta.
      4. "fullText": O texto completo do versículo na versão ARA.`);
    const response = await result.response;
    return JSON.parse(this.cleanJson(response.text()));
  }

  // --- NOVO: Gerar Exegese Profunda ---
  async generateDeepExegesis(verseRef: string, verseText: string): Promise<string> {
    const prompt = `Faça uma EXEGESE profunda e acadêmica de ${verseRef}: "${verseText}".
    
    ESTRUTURA DA RESPOSTA (Texto corrido, sem markdown negrito):
    1. ANÁLISE TEXTUAL: Idioma original (Grego/Hebraico), palavras chaves e significados.
    2. ANÁLISE SINTÁTICA: Estrutura gramatical relevante.
    3. CONTEXTO HISTÓRICO: Autor, data, destinatários.
    4. INTERPRETAÇÃO TEOLÓGICA: O que o texto significava lá e o que significa hoje.
    
    Seja técnico mas acessível a pastores.`;

    const model = this.getModel(this.libraryPrompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().replace(/\*\*/g, '').replace(/#/g, '');
  }

  // --- NOVO: Gerar Estudo Devocional ---
  async generateDevotionalStudy(verseRef: string, verseText: string): Promise<string> {
    const prompt = `Crie um pequeno ESTUDO DEVOCIONAL baseado em ${verseRef}.
    Foco: Aplicação prática, consolo e desafio espiritual.
    Estrutura:
    - O Que o Texto Diz?
    - O Que Isso nos Ensina sobre Deus?
    - Como Aplicar Hoje?
    `;

    const model = this.getModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().replace(/\*\*/g, '').replace(/#/g, '');
  }

  async generateStructure(details: any): Promise<any> {
    const prompt = `Crie um sermão bíblico fiel.
    DADOS: Versão: ${details.bibleVersion}, Tema: ${details.theme}, Texto: ${details.baseVerseRef}.
    Retorne JSON com: introduction, biblicalContext, points (title, subpoints, verses), finalApplication, conclusion.`;

    const model = this.getModel(this.systemPrompt, true);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(this.cleanJson(response.text()));
  }

  // --- NOVO MÉTODO DE CHAT TEOLÓGICO (TEXTO LIMPO) ---
  async chatWithTheologian(history: { role: string, text: string }[], sermonContext: any): Promise<string> {
    const chatSystemPrompt = `SYSTEM:
    Você é um Teólogo Acadêmico e Assistente Pastoral Sênior.
    OBJETIVO: Ajudar a escrever sermões profundos e edificantes.
    
    REGRAS DE FORMATAÇÃO (RIGOROSAS):
    1. NÃO use JSON, chaves {} ou colchetes [].
    2. NÃO use Markdown como negrito (**texto**) ou itálico (*texto*).
    3. Use apenas texto simples e pontuação correta.
    4. Para listas, use apenas hífens (-) ou números (1.).
    5. Seja direto e evite "metadados" na resposta.
    
    Responda em Português do Brasil culto e teológico.`;

    const contextString = `
    CONTEXTO DO SERMÃO:
    Tema: ${sermonContext.theme}
    Texto: ${sermonContext.baseVerseRef} ("${sermonContext.baseVerseText}")
    Público: ${sermonContext.targetAudience}
    Estrutura: ${JSON.stringify(sermonContext.points.map((p: any) => p.title))}
    `;

    const contents = [
      { role: 'user', parts: [{ text: `${contextString}\n\nResponda à última mensagem do usuário seguindo as regras de formatação.` }] },
      ...history.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }]
      }))
    ];

    const model = this.getModel(chatSystemPrompt);
    const result = await model.generateContent({
      contents: contents as any
    });
    const response = await result.response;

    let text = response.text();
    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/```json/g, '').replace(/```/g, '');
    return text;
  }

  private academicSystemPrompt = `SYSTEM:
  Você é um Acadêmico Teológico de Nível Doutorado (PhD), Historiador Eclesiástico e Filósofo da Religião.
  Sua linguagem deve ser formal, técnica, objetiva e profundamente embasada.
  
  FONTES E ESCOPO:
  1. Use terminologia técnica (Grego Koiné, Hebraico Bíblico, Latim Eclesiástico).
  2. Cite fontes Patrísticas (pais da igreja), Reformadores, e Teólogos Contemporâneos de renome (Barth, Tillich, Bonhoeffer, N.T. Wright, etc.).
  3. Aborde os temas sob viés Histórico-Crítico, Filosófico e Teológico Sistemático.
  4. Evite linguagem meramente devocional ou autoajuda. Seu foco é a CIÊNCIA DA RELIGIÃO e TEOLOGIA HISTÓRICA.
  5. Se questionado sobre polêmicas, apresente as diferentes correntes teológicas (ex: Calvinismo vs Arminianismo, Pré vs Amilenismo, Dispensacionalismo) com imparcialidade acadêmica.
  
  REGRAS DE FORMATAÇÃO:
  1. Não use JSON.
  2. Pode usar Markdown moderado (negrito para termos chave).
  3. Estruture em tópicos numéricos ou parágrafos densos.`;

  async chatWithAcademic(history: { role: string, text: string }[], context: any): Promise<string> {
    const contextString = `
    CONTEXTO ACADÊMICO SOLICITADO:
    Tema: ${context.theme}
    Texto: ${context.baseVerseRef}
    
    QUESTÃO: Analise a última mensagem sob a ótica acadêmica, histórica e filosófica.`;

    const contents = [
      { role: 'user', parts: [{ text: `${contextString}\n\nResponda à última mensagem do usuário.` }] },
      ...history.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }]
      }))
    ];

    const model = this.getModel(this.academicSystemPrompt);
    const result = await model.generateContent({
      contents: contents as any
    });
    const response = await result.response;

    return response.text();
  }

  // Novo método para gerar texto corrido do sermão
  async generateSermonDraft(sermonContext: any): Promise<string> {
    const chatSystemPrompt = `SYSTEM:
      Atue como um pregador experiente. Escreva um rascunho de sermão fluído e inspirador.
      Não use marcações markdown (**). Não use JSON. Apenas texto em parágrafos.`;

    const prompt = `Escreva um texto corrido para o sermão com o Tema: "${sermonContext.theme}".
      Baseado no texto: ${sermonContext.baseVerseRef}.
      Inclua: Introdução, desenvolvimento dos pontos (${sermonContext.points.map((p: any) => p.title).join(', ')}) e conclusão.
      Use uma linguagem pastoral, acolhedora e profunda.`;

    const model = this.getModel(chatSystemPrompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text().replace(/\*\*/g, '').replace(/#/g, '');
  }

  async getVerseTexts(refs: string[]): Promise<any[]> {
    if (refs.length === 0) return [];

    const prompt = `Tarefa: Retornar o texto bíblico EXATO e INTEGRAL para as referências: ${refs.join(', ')}.
    Não invente textos. Se a referência não existir, ignore-a.
    Retorne APENAS um JSON válido com a chave "verses".
    Exemplo de Saída:
    {
      "verses": [
        { "ref": "Jo 3:16", "text": "Porque Deus amou...", "keywords": ["Amor", "Salvação"], "crossRefs": ["Rm 5:8"] }
      ]
    }`;

    try {
      const model = this.getModel(this.systemPrompt, true);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(this.cleanJson(response.text()));
      return parsed.verses || [];
    } catch (error) {
      console.error("Erro na API de Versículos:", error);
      return [];
    }
  }

  // --- COMPARAÇÃO DE VERSÕES ---
  async getVerseComparison(ref: string): Promise<any[]> {
    const prompt = `Para o versículo "${ref}", retorne o texto exato nas seguintes versões:
    1. Almeida Revista e Atualizada (ARA)
    2. Nova Versão Internacional (NVI)
    3. Nova Tradução na Linguagem de Hoje (NTLH)
    4. Nova Versão Transformadora (NVT)
    5. Almeida Revista e Corrigida (ARC)
    
    Retorne APENAS um JSON:
    {
      "versions": [
        { "name": "ARA", "text": "..." },
        { "name": "NVI", "text": "..." },
        ...
      ]
    }`;

    const model = this.getModel(this.systemPrompt, true);
    const result = await model.generateContent(prompt);
    const response = await result.response;

    const data = JSON.parse(this.cleanJson(response.text()));
    return data.versions || [];
  }

  // --- CONSULTA BÍBLICA ROBUSTA ---
  async consultBible(version: string, book: string, chapter: string, verses: string): Promise<{ book: string, chapter: string, verses: any[] }> {
    const prompt = `ATUE COMO UMA API DE BÍBLIA DE ALTA PRECISÃO.
    
    SOLICITAÇÃO: Fornecer o texto bíblico COMPLETO e EXATO para:
    Livro: ${book}
    Capítulo: ${chapter}
    Versículos: ${verses && verses.trim() ? verses : 'TODOS (Capítulo completo)'}
    Versão: ${version}

    REGRAS INEGOCIÁVEIS:
    1. CORREÇÃO: Certifique-se de que o texto pertence ao livro e capítulo solicitados. (Não confunda livros).
    2. INTEGRIDADE: Retorne TODOS os versículos do capítulo se nenhum intervalo específico for pedido. Se o capítulo tem 50 versos, retorne 50 itens.
    3. FIDELIDADE: Use o texto da versão ${version} o mais fielmente possível.
    4. FORMATO: Retorne APENAS o JSON abaixo.

    Estrutura JSON Obrigatória:
    {
      "verses": [
        {
          "number": 1, // Número do versículo (integer)
          "text": "Texto completo do versículo...",
          "keywords": ["Palavra1", "Palavra2"], // 2 palavras-chave teológicas
          "crossRefs": ["Ref1", "Ref2"] // 2 referências cruzadas
        }
      ]
    }`;

    try {
      const model = this.getModel(this.systemPrompt, true);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const cleanText = this.cleanJson(text);
      const data = JSON.parse(cleanText);
      const versesList = data.verses || data;
      // Ordenar por segurança
      const sortedVerses = Array.isArray(versesList) ? versesList.sort((a: any, b: any) => a.number - b.number) : [];
      return { book, chapter, verses: sortedVerses };
    } catch (e: any) {
      console.error("Erro ao consultar Bíblia:", e);
      throw new Error(`Falha na API: ${e.message || e}`);
    }
  }

  async analyzeVerse(ref: string, text: string, version: string): Promise<any> {
    const model = this.getModel(this.systemPrompt, true);
    const result = await model.generateContent(`Faça uma exegese curta de: "${text}" (${ref}). JSON: historicalContext, theologicalInsight, keyword (original word with meaning), themes (array of strings), application.`);
    const response = await result.response;
    return JSON.parse(this.cleanJson(response.text()));
  }

  // --- MÓDULO BIBLIOTECA ACADÊMICA ---
  async libraryResearch(category: string, query: string): Promise<string> {
    const prompt = `CATEGORIA: ${category}
      PERGUNTA DO USUÁRIO: "${query}"
      
      Elabore um material de nível superior (faculdade de teologia) sobre este tema.
      Use dados históricos, referências cruzadas, idiomas originais (quando pertinente) e contexto arqueológico.
      Formate como um artigo acadêmico ou verbete de enciclopédia bíblica.`;

    const model = this.getModel(this.libraryPrompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().replace(/\*\*/g, '').replace(/#/g, '');
  }

  // --- GERAÇÃO DE IMAGENS BÍBLICAS ---
  async generateBiblicalImage(prompt: string): Promise<string | null> {
    console.warn("Geração de imagem temporariamente indisponível.");
    return null;
    /*
    try {
      // Modelo especializado em imagens
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Historical biblical scene, cinematic lighting, photorealistic, detailed, 8k, archeologically accurate representation of: ${prompt}`,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg'
        }
      });

      const bytes = response.generatedImages?.[0]?.image?.imageBytes;
      return bytes ? `data:image/jpeg;base64,${bytes}` : null;
    } catch (e) {
      console.error("Erro ao gerar imagem:", e);
      return null;
    }
    */
  }

  async getBookIntroduction(book: string): Promise<string> {
    const prompt = `Forneça uma INTRODUÇÃO acadêmica e concisa para o livro de ${book}.
    Inclua:
    1. Autor e Data aproximada.
    2. Contexto Histórico e Destinatários.
    3. Temas Principais e Mensagem Central.
    4. Estrutura do Livro (resumo em 2 linhas).
    
    Regras:
    - Linguagem Acadêmica/Seminário.
    - NÃO use Markdown (negrito/itálico).
    - Use CAIXA ALTA para títulos de seção (ex: AUTORIA E DATA).
    - Se o livro for um dos 66 da Bíblia, responda. Se não, informe que só atende livros bíblicos.`;

    const model = this.getModel(this.libraryPrompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().replace(/\*\*/g, '').replace(/#/g, '').trim();
  }

  private cleanJson(text: string): string {
    if (!text) return '{}';
    // Remove blocos de código markdown se existirem
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Tenta encontrar o início { e fim } se ainda houver ruído
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    return cleaned;
  }
}
