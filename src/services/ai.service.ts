
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({ providedIn: 'root' })
export class AIService {
  private ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  private model = 'gemini-2.5-flash';

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
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: `Sugira 5 temas bíblicos impactantes baseados no seguinte contexto: "${context}". Retorne apenas os títulos separados por quebra de linha.`,
      config: { systemInstruction: this.systemPrompt }
    });
    return response.text.split('\n').filter(t => t.trim().length > 0);
  }

  async searchVerses(theme: string): Promise<any> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: `Você é um analisador bíblico exaustivo. Busque cerca de 15 versículos fundamentais e diretamente relacionados ao tema: "${theme}".
      Certifique-se de cobrir diferentes aspectos do tema.
      
      Para CADA versículo, retorne estritamente este objeto JSON:
      {
        "ref": "Livro X:Y",
        "text": "Texto completo...",
        "explanation": "Uma breve exegese teológica de 1 ou 2 frases explicando a conexão com o tema.",
        "keywords": ["Palavra1", "Palavra2", "Palavra3"],
        "crossRefs": ["Ref1", "Ref2"]
      }

      Retorne um JSON com a chave "verses" contendo a lista.`,
      config: {
        systemInstruction: this.systemPrompt,
        responseMimeType: 'application/json'
      }
    });
    return JSON.parse(this.cleanJson(response.text)).verses || JSON.parse(this.cleanJson(response.text));
  }

  // --- NOVO: Expandir Contexto do Versículo Base ---
  async expandVerseContext(ref: string): Promise<any> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: `Analise o versículo referência: "${ref}".
      
      Retorne um JSON estrito com:
      1. "keywords": 5 palavras-chave teológicas principais deste texto.
      2. "crossRefs": 5 referências cruzadas que explicam este texto.
      3. "mainTheme": O tema central deste versículo em uma frase curta.
      4. "fullText": O texto completo do versículo na versão ARA.`,
      config: {
        systemInstruction: this.systemPrompt,
        responseMimeType: 'application/json'
      }
    });
    return JSON.parse(this.cleanJson(response.text));
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

    const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { systemInstruction: this.libraryPrompt } // Usa o prompt da biblioteca para tom acadêmico
    });
    return response.text.replace(/\*\*/g, '').replace(/#/g, '');
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

    const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt
    });
    return response.text.replace(/\*\*/g, '').replace(/#/g, '');
  }

  async generateStructure(details: any): Promise<any> {
    const prompt = `Crie um sermão bíblico fiel.
    DADOS: Versão: ${details.bibleVersion}, Tema: ${details.theme}, Texto: ${details.baseVerseRef}.
    Retorne JSON com: introduction, biblicalContext, points (title, subpoints, verses), finalApplication, conclusion.`;

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: this.systemPrompt,
        responseMimeType: 'application/json'
      }
    });
    return JSON.parse(this.cleanJson(response.text));
  }

  // --- NOVO MÉTODO DE CHAT TEOLÓGICO (TEXTO LIMPO) ---
  async chatWithTheologian(history: {role: string, text: string}[], sermonContext: any): Promise<string> {
    // Prompt de sistema ESPECÍFICO para o chat: força texto limpo
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

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: contents as any,
      config: { 
        systemInstruction: chatSystemPrompt 
      }
    });

    // Limpeza extra por segurança
    let text = response.text;
    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/```json/g, '').replace(/```/g, '');
    return text;
  }

  // Novo método para gerar texto corrido do sermão
  async generateSermonDraft(sermonContext: any): Promise<string> {
      const chatSystemPrompt = `SYSTEM:
      Atue como um pregador experiente. Escreva um rascunho de sermão fluído e inspirador.
      Não use marcações markdown (**). Não use JSON. Apenas texto em parágrafos.`;
      
      const prompt = `Escreva um texto corrido para o sermão com o Tema: "${sermonContext.theme}".
      Baseado no texto: ${sermonContext.baseVerseRef}.
      Inclua: Introdução, desenvolvimento dos pontos (${sermonContext.points.map((p:any) => p.title).join(', ')}) e conclusão.
      Use uma linguagem pastoral, acolhedora e profunda.`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { systemInstruction: chatSystemPrompt }
      });
      
      return response.text.replace(/\*\*/g, '').replace(/#/g, '');
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
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { systemInstruction: this.systemPrompt, responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(this.cleanJson(response.text));
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

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: this.systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const data = JSON.parse(this.cleanJson(response.text));
    return data.versions || [];
  }

  // --- CONSULTA BÍBLICA ROBUSTA ---
  async consultBible(version: string, book: string, chapter: string, verses: string): Promise<{book: string, chapter: string, verses: any[]}> {
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

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: this.systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const cleanText = this.cleanJson(response.text);
    try {
      const data = JSON.parse(cleanText);
      const versesList = data.verses || data; 
      // Ordenar por segurança
      const sortedVerses = Array.isArray(versesList) ? versesList.sort((a: any, b: any) => a.number - b.number) : [];
      return { book, chapter, verses: sortedVerses };
    } catch (e) {
      console.error("Erro ao parsear Bíblia:", e);
      return { book, chapter, verses: [] };
    }
  }

  async analyzeVerse(ref: string, text: string, version: string): Promise<any> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: `Faça uma exegese curta de: "${text}" (${ref}). JSON: historicalContext, theologicalInsight, keyword (original word with meaning), themes (array of strings), application.`,
      config: { systemInstruction: this.systemPrompt, responseMimeType: 'application/json' }
    });
    return JSON.parse(this.cleanJson(response.text));
  }

  // --- MÓDULO BIBLIOTECA ACADÊMICA ---
  async libraryResearch(category: string, query: string): Promise<string> {
      const prompt = `CATEGORIA: ${category}
      PERGUNTA DO USUÁRIO: "${query}"
      
      Elabore um material de nível superior (faculdade de teologia) sobre este tema.
      Use dados históricos, referências cruzadas, idiomas originais (quando pertinente) e contexto arqueológico.
      Formate como um artigo acadêmico ou verbete de enciclopédia bíblica.`;

      const response = await this.ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: { systemInstruction: this.libraryPrompt }
      });
      
      // Remove formatações markdown para exibição limpa
      return response.text.replace(/\*\*/g, '').replace(/#/g, '');
  }

  // --- GERAÇÃO DE IMAGENS BÍBLICAS ---
  async generateBiblicalImage(prompt: string): Promise<string | null> {
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
        return null; // Retorna null se falhar para não quebrar o fluxo
    }
  }

  private cleanJson(text: string): string {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
  }
}
