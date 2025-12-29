
export interface SermonPoint {
  title: string;
  subpoints: string[];
  verses: string[];
}

export interface SermonData {
  id?: string; // Identificador único para salvar
  lastModified?: number; // Data da última edição
  
  theme: string;
  bibleVersion: string;
  preacher: string;
  type: 'Expositiva' | 'Temática' | 'Textual' | 'Evangelística' | 'Doutrinária';
  date: string;
  baseVerseRef: string;
  baseVerseText: string;
  
  // New fields based on official prompt
  targetAudience: string;
  sermonObjective: string;

  keywords: string[];
  crossReferences: string[];
  
  introduction: string;
  biblicalContext: string; // New field
  points: SermonPoint[];
  finalApplication: string; // New field
  conclusion: string;

  illustrations: string;
  practicalApplications: string;
  pastoralObservations: string;
  personalNotes: string;
}

export const EMPTY_SERMON: SermonData = {
  theme: '',
  bibleVersion: 'ARA',
  preacher: '',
  type: 'Expositiva',
  date: new Date().toISOString().split('T')[0],
  baseVerseRef: '',
  baseVerseText: '',
  targetAudience: '',
  sermonObjective: '',
  keywords: [],
  crossReferences: [],
  introduction: '',
  biblicalContext: '',
  points: [
    { title: '', subpoints: [''], verses: [''] }
  ],
  finalApplication: '',
  conclusion: '',
  illustrations: '',
  practicalApplications: '',
  pastoralObservations: '',
  personalNotes: ''
};
