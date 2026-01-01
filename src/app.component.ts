
import { Component, signal, computed, inject, ViewChild, ElementRef, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService } from './services/ai.service';
import { SermonData, EMPTY_SERMON, SermonPoint } from './models/sermon.model';

declare var html2pdf: any;

interface SuggestionVerse {
  ref: string;
  text: string;
  explanation?: string;
  keywords: string[];
  crossRefs: string[];
  selected?: boolean;
}

interface BibleVerse {
  number: number;
  text: string;
  crossRefs: string[];
  keywords?: string[];
  highlighted: boolean;
  analysis?: {
    historicalContext: string;
    theologicalInsight: string;
    keyword: string;
    themes?: string[];
    application: string;
  } | null;
  loadingAnalysis?: boolean;
  copied?: boolean;
  addedToNotes?: boolean;
  analysisAddedToNotes?: boolean;
  analysisAddedToStructure?: boolean;
  isPlaying?: boolean;
}

interface BibleChapterData {
  ref: string;
  book: string;
  chapter: string;
  version: string;
  verses: BibleVerse[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface LibraryCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  placeholder: string;
}

const BIBLE_STRUCTURE = [
  { name: 'Gênesis', chapters: 50, test: 'AT' }, { name: 'Êxodo', chapters: 40, test: 'AT' }, { name: 'Levítico', chapters: 27, test: 'AT' },
  { name: 'Números', chapters: 36, test: 'AT' }, { name: 'Deuteronômio', chapters: 34, test: 'AT' }, { name: 'Josué', chapters: 24, test: 'AT' },
  { name: 'Juízes', chapters: 21, test: 'AT' }, { name: 'Rute', chapters: 4, test: 'AT' }, { name: '1 Samuel', chapters: 31, test: 'AT' },
  { name: '2 Samuel', chapters: 24, test: 'AT' }, { name: '1 Reis', chapters: 22, test: 'AT' }, { name: '2 Reis', chapters: 25, test: 'AT' },
  { name: '1 Crônicas', chapters: 29, test: 'AT' }, { name: '2 Crônicas', chapters: 36, test: 'AT' }, { name: 'Esdras', chapters: 10, test: 'AT' },
  { name: 'Neemias', chapters: 13, test: 'AT' }, { name: 'Ester', chapters: 10, test: 'AT' }, { name: 'Jó', chapters: 42, test: 'AT' },
  { name: 'Salmos', chapters: 150, test: 'AT' }, { name: 'Provérbios', chapters: 31, test: 'AT' }, { name: 'Eclesiastes', chapters: 12, test: 'AT' },
  { name: 'Cânticos', chapters: 8, test: 'AT' }, { name: 'Isaías', chapters: 66, test: 'AT' }, { name: 'Jeremias', chapters: 52, test: 'AT' },
  { name: 'Lamentações', chapters: 5, test: 'AT' }, { name: 'Ezequiel', chapters: 48, test: 'AT' }, { name: 'Daniel', chapters: 12, test: 'AT' },
  { name: 'Oseias', chapters: 14, test: 'AT' }, { name: 'Joel', chapters: 3, test: 'AT' }, { name: 'Amós', chapters: 9, test: 'AT' },
  { name: 'Obadias', chapters: 1, test: 'AT' }, { name: 'Jonas', chapters: 4, test: 'AT' }, { name: 'Miqueias', chapters: 7, test: 'AT' },
  { name: 'Naum', chapters: 3, test: 'AT' }, { name: 'Habacuque', chapters: 3, test: 'AT' }, { name: 'Sofonias', chapters: 3, test: 'AT' },
  { name: 'Ageu', chapters: 2, test: 'AT' }, { name: 'Zacarias', chapters: 14, test: 'AT' }, { name: 'Malaquias', chapters: 4, test: 'AT' },
  { name: 'Mateus', chapters: 28, test: 'NT' }, { name: 'Marcos', chapters: 16, test: 'NT' }, { name: 'Lucas', chapters: 24, test: 'NT' },
  { name: 'João', chapters: 21, test: 'NT' }, { name: 'Atos', chapters: 28, test: 'NT' }, { name: 'Romanos', chapters: 16, test: 'NT' },
  { name: '1 Coríntios', chapters: 16, test: 'NT' }, { name: '2 Coríntios', chapters: 13, test: 'NT' }, { name: 'Gálatas', chapters: 6, test: 'NT' },
  { name: 'Efésios', chapters: 6, test: 'NT' }, { name: 'Filipenses', chapters: 4, test: 'NT' }, { name: 'Colossenses', chapters: 4, test: 'NT' },
  { name: '1 Tessalonicenses', chapters: 5, test: 'NT' }, { name: '2 Tessalonicenses', chapters: 3, test: 'NT' }, { name: '1 Timóteo', chapters: 6, test: 'NT' },
  { name: '2 Timóteo', chapters: 4, test: 'NT' }, { name: 'Tito', chapters: 3, test: 'NT' }, { name: 'Filemom', chapters: 1, test: 'NT' },
  { name: 'Hebreus', chapters: 13, test: 'NT' }, { name: 'Tiago', chapters: 5, test: 'NT' }, { name: '1 Pedro', chapters: 5, test: 'NT' },
  { name: '2 Pedro', chapters: 3, test: 'NT' }, { name: '1 João', chapters: 5, test: 'NT' }, { name: '2 João', chapters: 1, test: 'NT' },
  { name: '3 João', chapters: 1, test: 'NT' }, { name: 'Judas', chapters: 1, test: 'NT' }, { name: 'Apocalipse', chapters: 22, test: 'NT' }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private aiService = inject(AIService);
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('chatContainerMain') chatContainerMain!: ElementRef;

  isAuthenticated = signal(false);
  username = signal('');
  password = signal('');
  loginError = signal(false);

  showSettings = signal(false);
  bibleKeyInput = signal('');
  libraryKeyInput = signal('');
  sermonKeyInput = signal('');
  generalKeyInput = signal('');

  currentView = signal<'dashboard' | 'sermon' | 'bible' | 'library' | 'documents'>('dashboard');
  chatMode = signal<'theologian' | 'academic'>('theologian');
  currentStep = signal(1);
  sermon = signal<SermonData>({ ...EMPTY_SERMON });
  savedSermons = signal<SermonData[]>([]);

  isLoading = signal(false);
  suggestedThemes = signal<string[]>([]);
  suggestedVerses = signal<SuggestionVerse[]>([]);
  allVerses = signal<Map<string, SuggestionVerse>>(new Map());
  showThemeSuggestions = signal(false);
  showVerseResults = signal(false);
  selectedCount = computed(() => this.suggestedVerses().filter(v => v.selected).length);
  newKeywordInput = signal('');

  chatMessages = signal<ChatMessage[]>([
    { role: 'assistant', text: 'Graça e paz. Sou seu Assistente Teológico Logos Pro. Estou pronto para ajudar. O que precisamos desenvolver agora?' }
  ]);
  chatInput = signal('');
  academicChatInput = signal('');
  isChatLoading = signal(false);
  isDraftLoading = signal(false);

  isABNTMode = signal(false);

  bibleStructure = BIBLE_STRUCTURE;
  bookSearchQuery = signal('');
  isAcademicChatOpen = signal(false);

  filteredBooksOT = computed(() => {
    const query = this.bookSearchQuery().toLowerCase();
    return this.booksOT().filter(b => b.name.toLowerCase().includes(query));
  });

  filteredBooksNT = computed(() => {
    const query = this.bookSearchQuery().toLowerCase();
    return this.booksNT().filter(b => b.name.toLowerCase().includes(query));
  });

  toggleAcademicChat() {
    this.isAcademicChatOpen.update(v => !v);
    if (this.isAcademicChatOpen()) {
      this.chatMode.set('academic');

      // Sync Bible context if in Bible view to help the AI
      if (this.currentView() === 'bible') {
        const b = this.bibleSearch();
        this.sermon.update(s => ({
          ...s,
          baseVerseRef: s.baseVerseRef || `${b.book} ${b.chapter}`
        }));
        // If Bible view is empty, try to load it
        if (!this.bibleData()) this.searchBiblePassage();
      }

      // If chat is empty, add a welcome message for academic mode
      if (this.chatMessages().length <= 1) {
        this.chatMessages.set([
          { role: 'assistant', text: 'Bem-vindo ao Chat Acadêmico Logos Pro. Sou seu consultor PhD em Teologia, História e Filosofia. Em que posso aprofundar seus estudos hoje?' }
        ]);
      }
    }
  }

  activeSelector = signal<'none' | 'books' | 'chapters' | 'verses'>('none');
  isNotesMinimized = signal(false);
  bibleFontSize = signal(1.125);

  booksOT = computed(() => this.bibleStructure.filter(b => b.test === 'AT'));
  booksNT = computed(() => this.bibleStructure.filter(b => b.test === 'NT'));

  currentBookChapters = computed(() => {
    const book = this.bibleStructure.find(b => b.name === this.bibleSearch().book);
    return book ? Array.from({ length: book.chapters }, (_, i) => i + 1) : [];
  });

  currentChapterVerses = computed(() => {
    const data = this.bibleData();
    // Use the actual number of verses if data is available, otherwise generic 150
    const count = (data && data.verses.length > 0) ? data.verses.length : 150;
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  targetAudiences = [
    'Geral (Toda a Igreja)',
    'Jovens e Adolescentes',
    'Homens',
    'Mulheres',
    'Casais',
    'Liderança / Obreiros',
    'Crianças / Infantil',
    'Não-convertidos (Evangelismo)'
  ];

  bibleVersions = [
    { id: 'ARC', name: 'Almeida Revista e Corrigida (ARC)' },
    { id: 'ARA', name: 'Almeida Revista e Atualizada (ARA)' },
    { id: 'ACF', name: 'Almeida Corrigida Fiel (ACF)' },
    { id: 'NVI', name: 'Nova Versão Internacional (NVI)' },
    { id: 'NTLH', name: 'Nova Tradução na Linguagem de Hoje (NTLH)' },
    { id: 'NBV', name: 'Nova Bíblia Viva (NBV)' },
    { id: 'NVT', name: 'Nova Versão Transformadora (NVT)' },
    { id: 'BJ', name: 'Bíblia de Jerusalém (BJ)' },
    { id: 'PASTORAL', name: 'Bíblia Pastoral' },
    { id: 'AVE_MARIA', name: 'Bíblia Ave-Maria' },
    { id: 'CNBB', name: 'Bíblia Sagrada CNBB' },
    { id: 'TB', name: 'Tradução Brasileira (TB)' },
    { id: 'A21', name: 'Almeida Século 21' },
    { id: 'BHS', name: 'Bíblia Hebraica Stuttgartensia (AT Hebraico)' },
    { id: 'INT_GR', name: 'Novo Testamento Interlinear (Grego)' },
    { id: 'MSG', name: 'A Mensagem (MSG)' },
    { id: 'KJV', name: 'King James Version (KJV)' }
  ];

  bibleSearch = signal({
    version: 'ARA',
    book: 'Mateus',
    chapter: '1',
    verse: ''
  });

  bibleData = signal<BibleChapterData | null>(null);
  bookIntroduction = signal('');
  isIntroLoading = signal(false);
  showBookIntro = signal(false);

  readingVerse = signal<{ ref: string, text: string, keywords?: string[], crossRefs?: string[] } | null>(null);
  comparisonData = signal<{ ref: string, versions: { name: string, text: string }[] } | null>(null);

  bgAudio = new Audio();
  defaultAudioUrl = 'https://cdn.pixabay.com/audio/2022/03/09/audio_a77a97b204.mp3';
  isMeditationMode = signal(false);
  isReadingChapter = signal(false);

  availableVoices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoice = signal<string>('');

  libraryCategories: LibraryCategory[] = [
    { id: 'ESTUDOS', title: 'Estudos Bíblicos', description: 'Antigo e Novo Testamento, Personagens, Livros e Doutrinas.', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', placeholder: 'Ex: Panorama de Romanos, Vida de Davi, Doutrina da Salvação...' },
    { id: 'GEOGRAFIA', title: 'Mapas e Geografia', description: 'Geografia do mundo bíblico, rotas, cidades e topografia.', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', placeholder: 'Ex: Rota do Êxodo, Geografia de Jerusalém, Viagens de Paulo...' },
    { id: 'VISUAL', title: 'Imagens e Objetos', description: 'Geração de imagens IA, Reconstruções históricas, Templo e Cultura Material.', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', placeholder: 'Ex: Gere uma imagem da Arca da Aliança, Templo de Salomão, O Mar Vermelho...' },
    { id: 'DICIONARIO', title: 'Dicionário Teológico', description: 'Definições profundas, termos originais (Grego/Hebraico) e conceitos.', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', placeholder: 'Ex: Graça (Charis), Propiciação, Logos, Shekinah, Justificação...' },
    { id: 'HISTORIA', title: 'História das Religiões', description: 'Judaísmo, Cristianismo, Reformas e Movimentos Religiosos.', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', placeholder: 'Ex: Surgimento do Protestantismo, Período Intertestamentário, Concílio de Niceia...' },
    { id: 'ARQUEOLOGIA', title: 'Arqueologia Bíblica', description: 'Descobertas, Manuscritos (Mar Morto) e Evidências Históricas.', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', placeholder: 'Ex: Rolos do Mar Morto, Pedra de Roseta, Tanque de Siloé...' },
    { id: 'TUTOR', title: 'Tutor Acadêmico (IA)', description: 'Pesquisa avançada, criação de ementas, aulas e resumos.', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', placeholder: 'Ex: Resumo de Teologia Sistemática, Plano de aula sobre Evangelhos...' }
  ];

  activeLibraryCategory = signal<LibraryCategory | null>(null);
  libraryQuery = signal('');
  libraryResult = signal('');
  libraryImage = signal<string | null>(null);
  libraryReferences = signal<any[]>([]);
  showLibraryVerseText = signal(true);

  isLibraryLoading = signal(false);
  isReadingLibrary = signal(false);
  isExtractingVerses = signal(false);

  steps = [
    { id: 1, name: 'Detalhes', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 2, name: 'Estrutura', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { id: 3, name: 'Anotações', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 4, name: 'Pré-impressão', icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' }
  ];

  constructor() {
    effect(() => {
      const messages = this.chatMessages();
      setTimeout(() => this.scrollToBottom(), 100);
    });

    // Auto-load bible passage when entering Bible view if not loaded
    effect(() => {
      if (this.currentView() === 'bible' && !this.bibleData() && this.aiService.hasKey()) {
        this.searchBiblePassage();
      }
    });

    this.bgAudio.src = this.defaultAudioUrl;
    this.bgAudio.loop = true;
    this.bgAudio.volume = 0.15;

    this.bgAudio.onerror = (e) => {
      console.warn("Erro ao carregar áudio de fundo.", e);
    };

    this.initVoices();
  }

  ngOnInit() {
    const saved = localStorage.getItem('savedSermons');
    if (saved) {
      try {
        let list = JSON.parse(saved);
        let migrationNeeded = false;
        list = list.map((s: any) => {
          if (!s.id) {
            s.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
            migrationNeeded = true;
          }
          return s;
        });
        if (migrationNeeded) localStorage.setItem('savedSermons', JSON.stringify(list));
        this.savedSermons.set(list);
      } catch (e) { console.error("Erro ao carregar sermões", e); }
    }
  }

  saveCurrentSermon() {
    const current = this.sermon();
    if (!current.theme || typeof current.theme !== 'string' || !current.theme.trim()) {
      alert('Por favor, defina pelo menos um tema para o sermão antes de salvar.');
      return;
    }
    const sermonToSave = {
      ...current,
      id: current.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2)),
      lastModified: Date.now()
    };
    this.sermon.set(sermonToSave);
    this.savedSermons.update(list => {
      const index = list.findIndex(s => s.id === sermonToSave.id);
      let newList;
      if (index >= 0) {
        newList = [...list];
        newList[index] = sermonToSave;
      } else {
        newList = [sermonToSave, ...list];
      }
      localStorage.setItem('savedSermons', JSON.stringify(newList));
      return newList;
    });
    alert('Sermão salvo com sucesso em "Meus Arquivos"!');
  }

  loadSermon(savedSermon: SermonData) {
    if (confirm('Carregar este sermão substituirá o trabalho atual não salvo. Deseja continuar?')) {
      this.sermon.set({ ...savedSermon });
      this.currentView.set('sermon');
      this.currentStep.set(3);
    }
  }

  deleteSermon(doc: SermonData) {
    if (confirm('Tem certeza que deseja excluir este sermão permanentemente?')) {
      this.savedSermons.update(list => {
        const newList = list.filter(s => s.id !== doc.id);
        localStorage.setItem('savedSermons', JSON.stringify(newList));
        return newList;
      });
    }
  }

  printSavedSermon(savedSermon: SermonData) {
    const previous = this.sermon();
    this.sermon.set(savedSermon);
    this.currentView.set('sermon');
    this.currentStep.set(4);
    setTimeout(() => { this.printSermon(); }, 100);
  }

  generatePDFForSaved(savedSermon: SermonData) {
    const previous = this.sermon();
    this.sermon.set(savedSermon);
    this.currentView.set('sermon');
    this.currentStep.set(4);
    setTimeout(() => { this.downloadPDF(); }, 500);
  }

  initVoices() {
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      const ptVoices = voices.filter(v => v.lang.includes('pt'));
      if (ptVoices.length > 0) {
        this.availableVoices.set(ptVoices);
        if (!this.selectedVoice()) this.selectedVoice.set(ptVoices[0].name);
      } else {
        this.availableVoices.set(voices);
      }
    };
    window.speechSynthesis.onvoiceschanged = load;
    load();
  }

  scrollToBottom(): void {
    if (this.chatContainer) {
      try { this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight; } catch (err) { }
    }
    if (this.chatContainerMain) {
      try { this.chatContainerMain.nativeElement.scrollTop = this.chatContainerMain.nativeElement.scrollHeight; } catch (err) { }
    }
  }

  login() {
    if (this.username() === 'admin' && this.password() === 'admin') {
      this.isAuthenticated.set(true);
      this.loginError.set(false);
      this.currentView.set('dashboard');
    } else {
      this.loginError.set(true);
      this.password.set('');
    }
  }

  toggleSettings() {
    this.showSettings.update(v => !v);
    if (this.showSettings()) {
      this.loadStoredKeys();
    }
  }

  loadStoredKeys() {
    this.bibleKeyInput.set(localStorage.getItem('logos_pro_bible_key') || '');
    this.libraryKeyInput.set(localStorage.getItem('logos_pro_library_key') || '');
    this.sermonKeyInput.set(localStorage.getItem('logos_pro_sermon_key') || '');
  }

  saveBibleKey() {
    localStorage.setItem('logos_pro_bible_key', this.bibleKeyInput());
    this.aiService.refreshKeys();
    alert('Chave da Bíblia salva com sucesso!');
  }

  saveLibraryKey() {
    localStorage.setItem('logos_pro_library_key', this.libraryKeyInput());
    this.aiService.refreshKeys();
    alert('Chave da Biblioteca salva com sucesso!');
  }

  saveSermonKey() {
    localStorage.setItem('logos_pro_sermon_key', this.sermonKeyInput());
    this.aiService.refreshKeys();
    alert('Chave do Construtor salva com sucesso!');
  }

  applyToAllKeys() {
    const key = this.generalKeyInput().trim();
    if (!key) { alert('Digite uma chave primeiro.'); return; }

    this.bibleKeyInput.set(key);
    this.libraryKeyInput.set(key);
    this.sermonKeyInput.set(key);

    localStorage.setItem('logos_pro_bible_key', key);
    localStorage.setItem('logos_pro_library_key', key);
    localStorage.setItem('logos_pro_sermon_key', key);

    this.aiService.refreshKeys();
    alert('Chave aplicada a todos os módulos!');
  }

  clearKeys() {
    if (confirm('Deseja realmente limpar todas as chaves pessoais? O sistema voltará a usar as chaves padrão.')) {
      localStorage.removeItem('logos_pro_bible_key');
      localStorage.removeItem('logos_pro_library_key');
      localStorage.removeItem('logos_pro_sermon_key');

      this.bibleKeyInput.set('');
      this.libraryKeyInput.set('');
      this.sermonKeyInput.set('');
      this.generalKeyInput.set('');

      this.aiService.refreshKeys();
      alert('Chaves removidas. O sistema está usando o padrão.');
    }
  }

  updateBibleVersion(newVersion: string) {
    this.bibleSearch.update(s => ({ ...s, version: newVersion }));
    this.searchBiblePassage();
  }

  toggleSelector(type: 'books' | 'chapters' | 'verses') {
    if (this.activeSelector() === type) {
      this.activeSelector.set('none');
    } else {
      this.activeSelector.set(type);
    }
  }

  async selectBook(bookName: string) {
    this.bibleSearch.update(s => ({ ...s, book: bookName, chapter: '1', verse: '' }));
    this.activeSelector.set('chapters');

    // Sequential operations to avoid hitting API rate limits (429) simultaneously
    try {
      await this.loadBookIntroduction(bookName);
      await this.searchBiblePassage();
    } catch (e) {
      console.error("Erro ao carregar livro:", e);
    }
  }

  async loadBookIntroduction(bookName: string) {
    if (!this.aiService.hasKey()) return;
    this.isIntroLoading.set(true);
    this.bookIntroduction.set('');
    try {
      const intro = await this.aiService.getBookIntroduction(bookName);
      this.bookIntroduction.set(intro);
      this.showBookIntro.set(true);
    } catch (e) {
      console.error(e);
      this.bookIntroduction.set('Erro ao carregar introdução.');
    } finally {
      this.isIntroLoading.set(false);
    }
  }

  selectChapter(chapter: number) {
    this.bibleSearch.update(s => ({ ...s, chapter: chapter.toString(), verse: '' }));
    this.activeSelector.set('none');
    this.searchBiblePassage();
  }

  selectVerse(verse: number) {
    this.bibleSearch.update(s => ({ ...s, verse: verse.toString() }));
    this.activeSelector.set('none');
    this.searchBiblePassage();
  }

  selectVerseAll() {
    this.bibleSearch.update(s => ({ ...s, verse: '' }));
    this.activeSelector.set('none');
    this.searchBiblePassage();
  }

  increaseFontSize() {
    this.bibleFontSize.update(v => Math.min(v + 0.125, 3));
  }

  decreaseFontSize() {
    this.bibleFontSize.update(v => Math.max(v - 0.125, 0.8));
  }

  toggleNotesMinimize() { this.isNotesMinimized.update(v => !v); }

  async sendMessage() {
    if (!this.aiService.hasKey()) { alert('Chave API não configurada.'); return; }

    const isAcademic = this.isAcademicChatOpen();
    const text = isAcademic ? this.academicChatInput().trim() : this.chatInput().trim();

    if (!text || this.isChatLoading()) return;

    this.chatMessages.update(m => [...m, { role: 'user', text }]);

    if (isAcademic) {
      this.academicChatInput.set('');
    } else {
      this.chatInput.set('');
    }

    this.isChatLoading.set(true);
    try {
      const history = this.chatMessages().slice(-10);
      let response = '';
      if (isAcademic) {
        response = await this.aiService.chatWithAcademic(history, this.sermon());
      } else {
        response = await this.aiService.chatWithTheologian(history, this.sermon());
      }
      this.chatMessages.update(m => [...m, { role: 'assistant', text: response }]);
    } catch (e) {
      console.error(e);
      this.chatMessages.update(m => [...m, { role: 'assistant', text: 'Erro ao processar. Tente novamente.' }]);
    } finally {
      this.isChatLoading.set(false);
    }
  }

  async generateDraft() {
    if (!this.aiService.hasKey()) { alert('Chave API não configurada.'); return; }
    if (this.isDraftLoading()) return;
    this.isDraftLoading.set(true);
    try {
      const draft = await this.aiService.generateSermonDraft(this.sermon());
      this.sermon.update(s => ({ ...s, personalNotes: s.personalNotes ? `${s.personalNotes}\n\n${draft}` : draft }));
    } catch (e) { alert('Erro ao gerar rascunho.'); } finally { this.isDraftLoading.set(false); }
  }

  importStructureToNotes() {
    const s = this.sermon();
    let text = '';
    if (s.introduction) text += `--- INTRODUÇÃO ---\n${s.introduction}\n\n`;
    if (s.biblicalContext) text += `--- CONTEXTO BÍBLICO ---\n${s.biblicalContext}\n\n`;
    if (s.points && s.points.length > 0) {
      text += `--- DESENVOLVIMENTO ---\n`;
      s.points.forEach((p, i) => {
        text += `${i + 1}. ${p.title}\n`;
        if (p.subpoints && p.subpoints.length) text += `${p.subpoints.join('\n')}\n`;
        if (p.verses && p.verses.length && p.verses[0]) text += `(Ref: ${p.verses.join(', ')})\n`;
        text += '\n';
      });
    }
    if (s.finalApplication) text += `--- APLICAÇÃO FINAL ---\n${s.finalApplication}\n\n`;
    if (s.conclusion) text += `--- CONCLUSÃO ---\n${s.conclusion}\n\n`;
    if (!text) { alert('A estrutura ainda está vazia. Preencha o passo 2 primeiro.'); return; }
    this.sermon.update(prev => ({ ...prev, personalNotes: prev.personalNotes ? `${prev.personalNotes}\n\n${text}` : text }));
  }

  copyToNotes(text: string) {
    const cleanText = text.replace(/[*#\[\]{}]/g, '').trim();
    this.sermon.update(s => ({ ...s, personalNotes: s.personalNotes ? `${s.personalNotes}\n\n${cleanText}` : cleanText }));
  }

  async openVerseReading(ref: string) {
    if (!ref) return;
    const cached = this.getVerseByRef(ref);
    if (cached && !cached.text.includes('Carregando')) {
      this.readingVerse.set({ ref: cached.ref, text: cached.text, keywords: cached.keywords, crossRefs: cached.crossRefs });
      return;
    }
    this.isLoading.set(true);
    try {
      const fetched = await this.aiService.getVerseTexts([ref]);
      if (fetched && fetched.length > 0) {
        const v = fetched[0];
        this.allVerses.update(map => {
          const newMap = new Map(map);
          newMap.set(v.ref, { ref: v.ref, text: v.text, keywords: v.keywords || [], crossRefs: v.crossRefs || [], selected: false });
          return newMap;
        });
        this.readingVerse.set({ ref: v.ref, text: v.text, keywords: v.keywords || [], crossRefs: v.crossRefs || [] });
      } else { alert('Não foi possível carregar o texto deste versículo.'); }
    } catch (e) { console.error(e); alert('Erro ao buscar versículo.'); } finally { this.isLoading.set(false); }
  }

  closeReadingModal() { this.readingVerse.set(null); }

  goToChapterFromModal() {
    const v = this.readingVerse();
    if (v) {
      const parts = v.ref.trim().split(' ');
      if (parts.length >= 2) {
        const chapterVerse = parts.pop()!;
        const book = parts.join(' ');
        const [chapter] = chapterVerse.split(':');
        this.bibleSearch.update(s => ({ ...s, book: book, chapter: chapter || '1', verse: '' }));
        this.currentView.set('bible');
        this.closeReadingModal();
        setTimeout(() => { this.searchBiblePassage(); }, 100);
      }
    }
  }

  async searchBiblePassage() {
    if (!this.aiService.hasKey()) { alert('Chave API não configurada.'); return; }

    // Immediate feedback: clear data and show general loading
    this.isLoading.set(true);
    this.bibleData.set(null);

    try {
      const { version, book, chapter, verse } = this.bibleSearch();
      const versionObj = this.bibleVersions.find(v => v.id === version);
      const versionName = versionObj ? versionObj.name : version;

      const result = await this.aiService.consultBible(versionName, book, chapter, verse);

      if (!result || !result.verses || result.verses.length === 0) {
        throw new Error("Nenhum versículo retornado da IA.");
      }

      this.bibleData.set({
        ref: `${book} ${chapter}`,
        book,
        chapter,
        version,
        verses: result.verses.map(v => ({
          ...v,
          highlighted: false,
          analysis: null,
          loadingAnalysis: false,
          copied: false,
          addedToNotes: false,
          analysisAddedToNotes: false,
          analysisAddedToStructure: false,
          isPlaying: false,
          keywords: v.keywords || []
        }))
      });
    } catch (e) {
      console.error("Erro na busca bíblica:", e);
      alert(`Não conseguimos obter o texto bíblico. Erro: ${e}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleHighlight(index: number) {
    this.bibleData.update(data => {
      if (!data) return null;
      const newVerses = [...data.verses];
      newVerses[index].highlighted = !newVerses[index].highlighted;
      return { ...data, verses: newVerses };
    });
  }

  copyBibleText(index: number) {
    const data = this.bibleData();
    if (!data) return;
    const verse = data.verses[index];
    const ref = `${data.book} ${data.chapter}:${verse.number}`;
    const text = `${verse.text} (${ref} - ${data.version})`;
    this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].copied = true; return { ...d, verses: vs }; });
    setTimeout(() => { this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].copied = false; return { ...d, verses: vs }; }); }, 2000);
    this.fallbackCopyText(text);
  }

  fallbackCopyText(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try { document.execCommand('copy'); } catch (err) { }
    document.body.removeChild(textArea);
  }

  quickSearchRef(ref: string) {
    const parts = ref.split(' ');
    if (parts.length >= 2) {
      const last = parts.pop()!;
      const [chapter, verse] = last.split(':');
      this.bibleSearch.update(s => ({ ...s, chapter: chapter || '1', verse: verse || '' }));
    }
  }

  async analyzeVerse(index: number) {
    const data = this.bibleData();
    if (!data) return;
    const verse = data.verses[index];
    if (verse.analysis) return;
    this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].loadingAnalysis = true; return { ...d, verses: vs }; });
    try {
      const refFull = `${data.book} ${data.chapter}:${verse.number}`;
      const analysis = await this.aiService.analyzeVerse(refFull, verse.text, data.version);
      this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].analysis = analysis; vs[index].loadingAnalysis = false; return { ...d, verses: vs }; });
    } catch (e) { this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].loadingAnalysis = false; return { ...d, verses: vs }; }); }
  }

  addToSermonNotes(index: number) {
    const data = this.bibleData();
    if (!data) return;
    const verse = data.verses[index];
    const ref = `${data.book} ${data.chapter}:${verse.number}`;
    this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].addedToNotes = true; return { ...d, verses: vs }; });
    this.sermon.update(s => ({ ...s, personalNotes: s.personalNotes ? `${s.personalNotes}\n\n[Ref]: ${ref} - "${verse.text}"` : `[Ref]: ${ref} - "${verse.text}"`, crossReferences: s.crossReferences.includes(ref) ? s.crossReferences : [...s.crossReferences, ref] }));
  }

  addAnalysisToNotes(index: number) {
    const data = this.bibleData();
    if (!data) return;
    const verse = data.verses[index];
    if (!verse.analysis) return;
    const ref = `${data.book} ${data.chapter}:${verse.number}`;
    const analysisContent = `\n--- ESTUDO: ${ref} ---\nContexto: ${verse.analysis.historicalContext}\nTeologia: ${verse.analysis.theologicalInsight}\nPalavra: ${verse.analysis.keyword}\nAplicação: ${verse.analysis.application}\n`;
    this.sermon.update(s => ({ ...s, personalNotes: s.personalNotes ? s.personalNotes + analysisContent : analysisContent }));
    this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].analysisAddedToNotes = true; return { ...d, verses: vs }; });
  }

  addFullVerseToStructure(index: number) {
    const data = this.bibleData();
    if (!data) return;
    const verse = data.verses[index];
    const ref = `${data.book} ${data.chapter}:${verse.number}`;
    const subpoints: string[] = [`"${verse.text}"`];
    if (verse.analysis) {
      subpoints.push(`Contexto: ${verse.analysis.historicalContext}`);
      subpoints.push(`Teologia: ${verse.analysis.theologicalInsight}`);
      subpoints.push(`Aplicação: ${verse.analysis.application}`);
    }
    if (verse.keywords && verse.keywords.length > 0) this.sermon.update(s => ({ ...s, keywords: Array.from(new Set([...s.keywords, ...verse.keywords!])) }));
    const newPoint: SermonPoint = { title: `Estudo: ${ref}`, subpoints: subpoints, verses: [ref, ...(verse.crossRefs || [])] };
    this.sermon.update(s => { if (s.points.length === 1 && !s.points[0].title && (!s.points[0].subpoints[0] || s.points[0].subpoints[0] === '')) { return { ...s, points: [newPoint] }; } return { ...s, points: [...s.points, newPoint] }; });
    this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].analysisAddedToStructure = true; return { ...d, verses: vs }; });
  }

  addAnalysisToStructure(index: number) { this.addFullVerseToStructure(index); }

  sendToStructure(verseIndexOrRef: number | string) {
    let verseRef = '', verseText = '', keywords: string[] = [], crossRefs: string[] = [];
    if (typeof verseIndexOrRef === 'number') {
      const data = this.bibleData(); if (!data) return; const v = data.verses[verseIndexOrRef];
      verseRef = `${data.book} ${data.chapter}:${v.number}`; verseText = v.text; keywords = v.keywords || []; crossRefs = v.crossRefs || [];
    } else {
      const v = this.readingVerse(); if (v) { verseRef = v.ref; verseText = v.text; keywords = v.keywords || []; crossRefs = v.crossRefs || []; }
    }
    this.sermon.update(s => ({ ...s, baseVerseRef: verseRef, baseVerseText: verseText, keywords: Array.from(new Set([...s.keywords, ...keywords])), crossReferences: Array.from(new Set([...s.crossReferences, ...crossRefs])) }));
    this.currentView.set('sermon'); this.currentStep.set(2); this.closeReadingModal();
    setTimeout(() => this.fetchMissingVerses(), 100);
  }

  removeReference(ref: string) { this.sermon.update(s => ({ ...s, crossReferences: s.crossReferences.filter(r => r !== ref) })); }

  async openVersionComparison(index: number) {
    const data = this.bibleData(); if (!data) return; const verse = data.verses[index]; const ref = `${data.book} ${data.chapter}:${verse.number}`;
    this.isLoading.set(true);
    try { const result = await this.aiService.getVerseComparison(ref); this.comparisonData.set({ ref, versions: result }); } catch (e) { alert('Erro ao comparar versões.'); } finally { this.isLoading.set(false); }
  }

  closeComparisonModal() { this.comparisonData.set(null); }

  resetSermon() {
    this.sermon.set({ ...EMPTY_SERMON }); this.suggestedVerses.set([]); this.allVerses.set(new Map());
    this.currentStep.set(1); this.showThemeSuggestions.set(false); this.showVerseResults.set(false);
  }

  addManualKeyword() {
    const val = this.newKeywordInput().trim();
    if (val) { this.sermon.update(s => ({ ...s, keywords: [...s.keywords, val] })); this.newKeywordInput.set(''); }
  }

  removeKeyword(index: number) { this.sermon.update(s => ({ ...s, keywords: s.keywords.filter((_, i) => i !== index) })); }

  async suggestTheme() {
    if (!this.aiService.hasKey()) { alert('Chave API não configurada.'); return; }
    this.isLoading.set(true);
    try { const themes = await this.aiService.suggestTheme(this.sermon().theme || 'Um sermão edificante'); this.suggestedThemes.set(themes); this.showThemeSuggestions.set(true); this.showVerseResults.set(false); } catch (e) { } finally { this.isLoading.set(false); }
  }

  async searchVerses() {
    if (!this.aiService.hasKey()) { alert('Chave API não configurada.'); return; }
    if (!this.sermon().theme) return;
    this.isLoading.set(true);
    try { const verses = await this.aiService.searchVerses(this.sermon().theme); this.allVerses.update(map => { const newMap = new Map(map); verses.forEach((v: any) => newMap.set(v.ref, v)); return newMap; }); this.suggestedVerses.set(verses.map((v: any) => ({ ...v, selected: false }))); this.showVerseResults.set(true); this.showThemeSuggestions.set(false); } catch (e) { } finally { this.isLoading.set(false); }
  }

  searchByKeyword(keyword: string) { this.sermon.update(s => ({ ...s, theme: keyword })); this.searchVerses(); this.currentStep.set(1); }

  toggleVerseSelection(index: number) {
    this.suggestedVerses.update(verses => { const newVerses = [...verses]; newVerses[index].selected = !newVerses[index].selected; return newVerses; });
  }

  addSelectedToReferences() {
    const selected = this.suggestedVerses().filter(v => v.selected); if (selected.length === 0) return;
    this.sermon.update(s => ({ ...s, crossReferences: Array.from(new Set([...s.crossReferences, ...selected.map(v => v.ref)])) }));
    this.suggestedVerses.update(vs => vs.map(v => ({ ...v, selected: false }))); this.fetchMissingVerses();
  }

  addSelectedToStructure() {
    const selected = this.suggestedVerses().filter(v => v.selected); if (selected.length === 0) return;
    this.sermon.update(s => {
      const newPoints = selected.map(v => ({ title: `Estudo sobre ${v.ref}`, subpoints: [v.text], verses: [v.ref] }));
      if (s.points.length === 1 && !s.points[0].title) { return { ...s, points: newPoints }; }
      return { ...s, points: [...s.points, ...newPoints] };
    });
    this.suggestedVerses.update(vs => vs.map(v => ({ ...v, selected: false })));
  }

  selectTheme(theme: string) { this.sermon.update(s => ({ ...s, theme })); this.showThemeSuggestions.set(false); this.searchVerses(); }

  async useAsBaseVerse(verse: any) {
    this.sermon.update(s => ({ ...s, baseVerseRef: verse.ref, baseVerseText: verse.text, keywords: Array.from(new Set([...s.keywords, ...(verse.keywords || [])])), crossReferences: Array.from(new Set([...s.crossReferences, ...(verse.crossRefs || [])])) }));
    await this.fetchMissingVerses();
  }

  async generateStructure() {
    if (!this.aiService.hasKey()) { alert('Chave API não configurada.'); return; }
    this.isLoading.set(true);
    try { const structure = await this.aiService.generateStructure(this.sermon()); this.sermon.update(s => ({ ...s, introduction: structure.introduction, biblicalContext: structure.biblicalContext, points: structure.points, finalApplication: structure.finalApplication, conclusion: structure.conclusion })); await this.fetchMissingVerses(); } catch (e) { } finally { this.isLoading.set(false); }
  }

  async fetchMissingVerses() {
    if (!this.aiService.hasKey()) {
      alert('Chave API não configurada.');
      return;
    }
    const neededRefs = new Set<string>();
    this.sermon().crossReferences.forEach(r => neededRefs.add(r));
    this.sermon().points.forEach(p => p.verses.forEach(v => { if (v) neededRefs.add(v); }));
    const missing = Array.from(neededRefs).filter(ref => { if (!ref || typeof ref !== 'string' || ref.trim().length === 0) return false; const cached = this.getVerseByRef(ref); return !cached || cached.text === 'Carregando texto...' || cached.text === 'Texto indisponível'; });
    if (missing.length === 0) return;
    this.isLoading.set(true);
    try {
      const fetched = await this.aiService.getVerseTexts(missing);
      this.allVerses.update(map => {
        const newMap = new Map(map);
        fetched.forEach((v: any) => { newMap.set(v.ref, { ref: v.ref, text: v.text, keywords: [], crossRefs: [], selected: false }); });
        missing.forEach(ref => { const found = fetched.find((f: any) => f.ref === ref); if (!found) { newMap.set(ref, { ref: ref, text: 'Texto indisponível', keywords: [], crossRefs: [], selected: false }); } });
        return newMap;
      });
    } catch (e) { this.allVerses.update(map => { const newMap = new Map(map); missing.forEach(ref => { newMap.set(ref, { ref: ref, text: 'Erro ao carregar', keywords: [], crossRefs: [], selected: false }); }); return newMap; }); } finally { this.isLoading.set(false); }
  }

  getVerseByRef(ref: string | undefined | null): SuggestionVerse | undefined {
    if (!ref || typeof ref !== 'string') return undefined;
    const all = this.allVerses();
    if (all.has(ref)) return all.get(ref);
    const normalize = (s: string) => (s && typeof s === 'string' ? s.toLowerCase().replace(/\s+/g, '').replace(/\./g, ':') : '');
    const target = normalize(ref);
    for (const [key, val] of all.entries()) { if (typeof key === 'string' && normalize(key) === target) return val; }
    for (const [key, val] of all.entries()) { if (typeof key === 'string' && (key.includes(ref) || ref.includes(key))) return val; }
    return undefined;
  }

  addPoint() { this.sermon.update(s => ({ ...s, points: [...s.points, { title: '', subpoints: [''], verses: [''] }] })); }
  removePoint(index: number) { this.sermon.update(s => ({ ...s, points: s.points.filter((_, i) => i !== index) })); }
  nextStep() { if (this.currentStep() < 4) this.currentStep.update(s => s + 1); }
  prevStep() { if (this.currentStep() > 1) this.currentStep.update(s => s - 1); }
  toggleABNT() { this.isABNTMode.update(v => !v); }
  toggleLibraryVerseText() { this.showLibraryVerseText.update(v => !v); }

  private printContent(elementId: string, title: string) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const content = element.innerHTML;
    const printWindow = window.open('', '_blank', 'height=900,width=800');
    if (!printWindow) { alert('Por favor, permita popups para imprimir.'); return; }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><script src="https://cdn.tailwindcss.com"><\/script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet"><style>@page { margin: 1.5cm; size: A4; } body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .serif { font-family: 'Playfair Display', serif; } .abnt-paper { width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; } button, .no-print { display: none !important; }</style></head><body class="bg-white text-slate-900">${content}<script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 1000); };<\/script></body></html>`);
    printWindow.document.close();
  }

  printSermon() {
    this.fetchMissingVerses().then(() => { const id = this.isABNTMode() ? 'sermon-document-abnt' : 'sermon-preview-standard'; this.printContent(id, `Sermão - ${this.sermon().theme}`); });
  }

  downloadPDF() {
    this.isLoading.set(true);
    this.fetchMissingVerses().then(() => {
      const elementId = this.isABNTMode() ? 'sermon-document-abnt' : 'sermon-preview-standard';
      const originalElement = document.getElementById(elementId);

      if (!originalElement) {
        alert('Elemento de conteúdo não encontrado.');
        this.isLoading.set(false);
        return;
      }

      // Criar um clone limpo para PDF
      const clonedElement = originalElement.cloneNode(true) as HTMLElement;

      // Configurações críticas para garantir que o PDF não saia em branco
      clonedElement.style.width = '210mm';
      clonedElement.style.minHeight = '297mm';
      clonedElement.style.height = 'auto';
      clonedElement.style.background = 'white';
      clonedElement.style.color = 'black';
      clonedElement.style.margin = '0';
      clonedElement.style.padding = '20mm';

      // Fix para evitar que saia em branco
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '0';
      clonedElement.style.top = '0';
      clonedElement.style.zIndex = '50'; // Abaixo do loading (z-100) mas visível no DOM
      clonedElement.style.backgroundColor = 'white'; // Garantir fundo branco

      // Remove sombras e transformações que podem afetar o PDF
      clonedElement.style.boxShadow = 'none';
      clonedElement.style.transform = 'none';

      document.body.appendChild(clonedElement);

      const opt = {
        margin: 0,
        filename: `${this.sermon().theme || 'Sermão'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          windowWidth: 1200
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      setTimeout(() => {
        html2pdf().set(opt).from(clonedElement).save().then(() => {
          if (document.body.contains(clonedElement)) document.body.removeChild(clonedElement);
          this.isLoading.set(false);
        }).catch((err: any) => {
          console.error(err);
          if (document.body.contains(clonedElement)) document.body.removeChild(clonedElement);
          this.isLoading.set(false);
          alert('Erro ao gerar PDF.');
        });
      }, 1000);
    });
  }

  printLibrary() { this.printContent('library-content', `Pesquisa - ${this.activeLibraryCategory()?.title}`); }

  downloadLibraryPDF() {
    this.isLoading.set(true);
    const element = document.getElementById('library-content');
    if (!element) {
      this.isLoading.set(false);
      alert('Conteúdo da biblioteca não encontrado.');
      return;
    }

    // Clone para evitar cortar conteúdo
    const cloned = element.cloneNode(true) as HTMLElement;

    cloned.style.width = '210mm';
    cloned.style.minHeight = '297mm';
    cloned.style.height = 'auto';
    cloned.style.background = 'white';
    cloned.style.color = 'black';
    cloned.style.padding = '10mm';

    // Fix para evitar que saia em branco
    cloned.style.position = 'fixed';
    cloned.style.left = '0';
    cloned.style.top = '0';
    cloned.style.zIndex = '-9999';

    // Resets
    cloned.style.boxShadow = 'none';
    cloned.style.transform = 'none';
    cloned.style.margin = '0';

    document.body.appendChild(cloned);

    const opt = {
      margin: 0,
      filename: `Logos_Pesquisa_${this.activeLibraryCategory()?.title || 'Biblioteca'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        windowWidth: 1200
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    setTimeout(() => {
      html2pdf().set(opt).from(cloned).save().then(() => {
        if (document.body.contains(cloned)) document.body.removeChild(cloned);
        this.isLoading.set(false);
      }).catch((err: any) => {
        console.error(err);
        if (document.body.contains(cloned)) document.body.removeChild(cloned);
        this.isLoading.set(false);
        alert('Erro ao gerar PDF da biblioteca.');
      });
    }, 1000);
  }

  async extractVersesFromLibraryText() {
    const text = this.libraryResult();
    if (!text) { alert('Não há texto para analisar.'); return; }
    this.isExtractingVerses.set(true);
    try {
      const regex = /\b((?:[123]\s)?[A-ZÀ-Ú][a-zà-úçãõâêîôû]+\.?)\s+(\d+)(?:[:.](\d+(?:-\d+)?))?\b/g;
      const found = new Set<string>();
      let match;
      while ((match = regex.exec(text)) !== null) {
        const book = match[1]; const chapter = match[2]; const verse = match[3] ? `:${match[3]}` : '';
        found.add(`${book} ${chapter}${verse}`);
      }
      if (found.size === 0) { alert('Nenhuma referência bíblica encontrada no texto.'); this.isExtractingVerses.set(false); return; }
      const existingRefs = this.libraryReferences().map(r => r.ref);
      const newRefs = Array.from(found).filter(r => !existingRefs.includes(r));
      if (newRefs.length === 0) { this.isExtractingVerses.set(false); return; }
      const fetched = await this.aiService.getVerseTexts(newRefs);
      if (fetched && fetched.length > 0) { this.libraryReferences.update(current => [...current, ...fetched]); } else { alert('Não foi possível carregar os textos das referências encontradas.'); }
    } catch (e) { console.error(e); alert('Erro ao extrair versículos.'); } finally { this.isExtractingVerses.set(false); }
  }

  handleAudioUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      this.bgAudio.src = url; this.bgAudio.load();
      if (this.isMeditationMode()) { this.bgAudio.play().catch(e => console.error("Erro ao reproduzir arquivo:", e)); } else { this.isMeditationMode.set(true); this.bgAudio.play().catch(e => console.error("Erro ao reproduzir arquivo:", e)); }
    }
  }

  stopAudio() {
    window.speechSynthesis.cancel();
    this.isReadingChapter.set(false);
    this.isReadingLibrary.set(false);
    this.bibleData.update(d => { if (!d) return null; return { ...d, verses: d.verses.map(v => ({ ...v, isPlaying: false })) }; });
  }

  toggleLibraryAudio() {
    if (this.isReadingLibrary()) {
      this.stopAudio();
    } else {
      this.readLibraryResult();
    }
  }

  readLibraryResult() {
    this.stopAudio();
    const text = this.libraryResult();
    if (!text) return;

    this.isReadingLibrary.set(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;

    if (this.selectedVoice()) {
      const voice = this.availableVoices().find(vx => vx.name === this.selectedVoice());
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => { this.isReadingLibrary.set(false); };
    utterance.onerror = (e) => { console.error(e); this.stopAudio(); };

    window.speechSynthesis.speak(utterance);
  }

  toggleMeditation() {
    if (this.isMeditationMode()) { this.bgAudio.pause(); this.isMeditationMode.set(false); } else { this.bgAudio.play().catch(e => console.error("Erro ao reproduzir audio de fundo:", e)); this.isMeditationMode.set(true); }
  }

  readFullChapter() {
    this.stopAudio(); const data = this.bibleData(); if (!data || data.verses.length === 0) return;
    this.isReadingChapter.set(true); let index = 0;
    const speakNext = () => {
      if (!this.isReadingChapter() || index >= data.verses.length) { this.stopAudio(); return; }
      this.bibleData.update(d => { if (!d) return null; return { ...d, verses: d.verses.map((v, i) => ({ ...v, isPlaying: i === index })) }; });
      const v = data.verses[index]; const text = `${v.number}. ${v.text}`;
      const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'pt-BR'; utterance.rate = 0.9;
      if (this.selectedVoice()) { const voice = this.availableVoices().find(vx => vx.name === this.selectedVoice()); if (voice) utterance.voice = voice; }
      utterance.onend = () => { index++; speakNext(); }; utterance.onerror = (e) => { console.error(e); this.stopAudio(); };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  }

  playVerseAudio(index: number) {
    this.stopAudio(); const data = this.bibleData(); if (!data) return; const verse = data.verses[index];
    this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].isPlaying = true; return { ...d, verses: vs }; });
    const utterance = new SpeechSynthesisUtterance(verse.text); utterance.lang = 'pt-BR'; utterance.rate = 0.9;
    if (this.selectedVoice()) { const voiceObj = this.availableVoices().find(v => v.name === this.selectedVoice()); if (voiceObj) utterance.voice = voiceObj; }
    utterance.onend = () => { this.bibleData.update(d => { if (!d) return null; const vs = [...d.verses]; vs[index].isPlaying = false; return { ...d, verses: vs }; }); };
    window.speechSynthesis.speak(utterance);
  }

  async selectLibraryCategory(category: LibraryCategory) {
    this.activeLibraryCategory.set(category);
    this.libraryResult.set('');
    this.libraryImage.set(null);
    this.libraryReferences.set([]);
  }

  async searchLibrary() {
    if (!this.libraryQuery() || !this.activeLibraryCategory()) return;
    this.isLibraryLoading.set(true);
    this.libraryResult.set('');
    this.libraryImage.set(null);
    this.libraryReferences.set([]);

    try {
      const textPromise = this.aiService.libraryResearch(this.activeLibraryCategory()!.id, this.libraryQuery());
      const imagePromise = this.activeLibraryCategory()!.id === 'VISUAL' || this.activeLibraryCategory()!.id === 'ARQUEOLOGIA' || this.activeLibraryCategory()!.id === 'GEOGRAFIA'
        ? this.aiService.generateBiblicalImage(this.libraryQuery())
        : Promise.resolve(null);

      const [text, image] = await Promise.all([textPromise, imagePromise]);

      this.libraryResult.set(text);
      this.libraryImage.set(image);

      if (this.activeLibraryCategory()!.id !== 'VISUAL') {
        setTimeout(() => this.extractVersesFromLibraryText(), 500);
      }

    } catch (e) {
      console.error(e);
      alert('Erro na pesquisa da biblioteca.');
    } finally {
      this.isLibraryLoading.set(false);
    }
  }

  hasBibleKey(): boolean { return this.aiService.hasKey('bible'); }
  hasLibraryKey(): boolean { return this.aiService.hasKey('library'); }
  hasSermonKey(): boolean { return this.aiService.hasKey('sermon'); }

  hasCustomBibleKey(): boolean { return !!localStorage.getItem('logos_pro_bible_key'); }
  hasCustomLibraryKey(): boolean { return !!localStorage.getItem('logos_pro_library_key'); }
  hasCustomSermonKey(): boolean { return !!localStorage.getItem('logos_pro_sermon_key'); }

  // --- NOVO: Lógica de Pesquisa Reversa a partir do Versículo Base ---
  async analyzeBaseVerse() {
    if (!this.sermon().baseVerseRef) { alert('Digite uma referência primeiro (ex: João 3:16)'); return; }
    this.isLoading.set(true);
    try {
      // 1. Expandir o contexto do versículo
      const context = await this.aiService.expandVerseContext(this.sermon().baseVerseRef);

      // 2. Atualizar o Sermão com os dados descobertos
      this.sermon.update(s => ({
        ...s,
        baseVerseText: context.fullText || s.baseVerseText,
        theme: s.theme || context.mainTheme, // Usa o tema sugerido se estiver vazio
        keywords: Array.from(new Set([...s.keywords, ...(context.keywords || [])])),
        crossReferences: Array.from(new Set([...s.crossReferences, ...(context.crossRefs || [])]))
      }));

      // 3. Buscar versículos relacionados usando as palavras-chave descobertas
      if (context.keywords && context.keywords.length > 0) {
        const verses = await this.aiService.searchVerses(context.keywords.join(', '));
        this.allVerses.update(map => {
          const newMap = new Map(map);
          verses.forEach((v: any) => newMap.set(v.ref, v));
          return newMap;
        });
        this.suggestedVerses.set(verses.map((v: any) => ({ ...v, selected: false })));
        this.showVerseResults.set(true);
      }

    } catch (e) {
      console.error(e);
      alert('Erro ao analisar versículo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  addVerseToNotes(verse: SuggestionVerse) {
    const content = `\n[VERSÍCULO ADICIONADO]\n${verse.ref}: "${verse.text}"\n`;
    this.sermon.update(s => ({ ...s, personalNotes: (s.personalNotes || '') + content }));
    alert('Versículo adicionado às Anotações!');
  }

  async generateExegesis(verse: SuggestionVerse) {
    this.isLoading.set(true);
    try {
      const exegesis = await this.aiService.generateDeepExegesis(verse.ref, verse.text);
      const content = `\n--- EXEGESE: ${verse.ref} ---\n${exegesis}\n`;
      this.sermon.update(s => ({ ...s, personalNotes: (s.personalNotes || '') + content }));
      alert('Exegese gerada e salva nas Anotações.');
    } catch (e) {
      alert('Erro ao gerar exegese.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async generateDevotional(verse: SuggestionVerse) {
    this.isLoading.set(true);
    try {
      const study = await this.aiService.generateDevotionalStudy(verse.ref, verse.text);
      const content = `\n--- ESTUDO DEVOCIONAL: ${verse.ref} ---\n${study}\n`;
      this.sermon.update(s => ({ ...s, personalNotes: (s.personalNotes || '') + content }));
      alert('Estudo devocional salvo nas Anotações.');
    } catch (e) {
      alert('Erro ao gerar estudo.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
