
export interface AnalysisResult {
  matchScore: number;
  summary: string;
  generatedProfessionalSummary: string;
  strengths: string[];
  gaps: string[];
  missingKeywords: string[];
  actionableImprovements: string[];
  suggestedBulletPoints: {
    original: string;
    improved: string;
    reason: string;
  }[];
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}

export interface SavedAnalysis {
  id: string;
  timestamp: number;
  jobDescription: string;
  file: FileData;
  result: AnalysisResult;
}
