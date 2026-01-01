# 🔧 Guia de Correção da API do Gemini

## ✅ O que foi corrigido:

1. **Pacote atualizado**: De `@google/genai` para `@google/generative-ai` (oficial)
2. **Sintaxe corrigida**: Todos os métodos agora usam `genAI.getGenerativeModel()`
3. **Métodos principais atualizados**:
   - `suggestTheme()` - Sugestões de temas
   - `searchVerses()` - Busca de versículos
   - `consultBible()` - Leitura da Bíblia (PRINCIPAL)
   - `generateStructure()` - Geração de estrutura de sermão

## 🔑 Sua nova chave API:

```
AIzaSyC5OVkGZssfOGBs9fEdSaXx87gnfW17Cq4
```

## 📝 Como testar:

### 1. Configure a chave API na aplicação:
   - Abra http://localhost:3000
   - Faça login (admin/admin)
   - Clique no ícone de engrenagem (⚙️) no header
   - Cole a chave: `AIzaSyC5OVkGZssfOGBs9fEdSaXx87gnfW17Cq4`
   - Clique em "Salvar Configuração"

### 2. Teste a Bíblia:
   - Clique em "Bíblia Online" no dashboard
   - Selecione um livro (ex: João)
   - Selecione um capítulo (ex: 3)
   - Os versículos devem aparecer

## ⚠️ Se ainda não funcionar:

### Verifique no console do navegador (F12):
- Procure por erros em vermelho
- Se aparecer "API_KEY_INVALID", a chave pode estar incorreta
- Se aparecer "QUOTA_EXCEEDED", você atingiu o limite da API

### Possíveis soluções:
1. **Gere uma nova chave**: https://aistudio.google.com/app/apikey
2. **Verifique se a API está ativada** no Google Cloud Console
3. **Aguarde alguns minutos** se atingiu o limite de quota

## 🚀 Próximos passos:

Ainda preciso corrigir os outros métodos do serviço:
- `expandVerseContext()`
- `generateDeepExegesis()`
- `chatWithTheologian()`
- `chatWithAcademic()`
- `getVerseTexts()`
- `getVerseComparison()`
- `analyzeVerse()`
- `libraryResearch()`
- `getBookIntroduction()`

Quer que eu corrija todos eles agora?
