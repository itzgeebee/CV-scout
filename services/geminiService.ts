
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FileData } from "../types";

const MODEL_NAME = "gemini-3-pro-preview";

export const analyzeResume = async (
  jobDescription: string,
  cvFile: FileData
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const systemInstruction = `
    You are an expert HR Recruiter and Career Coach with 20 years of experience in technical recruiting.
    Your task is to analyze a candidate's CV against a specific Job Description (JD).
    
    Be critical but constructive. Identify exactly why the candidate might or might not get an interview.
    
    Specific Task: 
    1. Skill alignment (hard and soft skills).
    2. Missing keywords that ATS (Applicant Tracking Systems) look for.
    3. Formatting or impact issues in their bullet points.
    4. Provide concrete, rewritten bullet points for their experience section.
    5. GENERATE A PROFESSIONAL SUMMARY: Create a high-impact, 2-3 sentence professional summary specifically tailored for this candidate to use on their CV when applying for THIS specific job. It should highlight their most relevant achievements and skills matching the JD.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        parts: [
          { text: `Analyze this CV against the following Job Description: \n\nJD: ${jobDescription}` },
          {
            inlineData: {
              mimeType: cvFile.mimeType,
              data: cvFile.base64,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchScore: { type: Type.NUMBER, description: "A score from 0 to 100" },
          summary: { type: Type.STRING, description: "Overall assessment of the fit" },
          generatedProfessionalSummary: { type: Type.STRING, description: "A tailored 2-3 sentence professional summary for the CV" },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionableImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedBulletPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                improved: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["original", "improved", "reason"],
            },
          },
        },
        required: [
          "matchScore",
          "summary",
          "generatedProfessionalSummary",
          "strengths",
          "gaps",
          "missingKeywords",
          "actionableImprovements",
          "suggestedBulletPoints",
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error("No analysis result received from AI");
  }

  return JSON.parse(response.text) as AnalysisResult;
};

export const generateOptimizedCV = async (
  jobDescription: string,
  cvFile: FileData,
  analysis: AnalysisResult
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const systemInstruction = `
    You are a professional CV Writer. Your goal is to rewrite the candidate's CV to perfectly align with the provided Job Description, incorporating all identified improvements and keywords.
    
    CRITICAL RULE: 
    DO NOT lie or fabricate qualifications. Only rewrite and rephrase EXISTING experience to better match the Job Description. If a skill is missing from the CV, DO NOT add it as if the user has it.
    
    FORMATTING RULE: 
    DO NOT use Markdown formatting symbols. Pure plain text only. 
    Use CAPITAL LETTERS for headers and double line breaks.

    Instructions:
    1. Maintain contact info.
    2. Use the "Optimized Professional Summary".
    3. Rewrite experience section using the "Improved" bullet points.
    4. Integrate missing keywords ONLY where they realistically fit based on existing experience.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        parts: [
          { 
            text: `
              Job Description: ${jobDescription}
              Previous Analysis Summary: ${analysis.summary}
              Optimized Summary to use: ${analysis.generatedProfessionalSummary}
              Missing Keywords to include: ${analysis.missingKeywords.join(', ')}
              Actionable Improvements to apply: ${analysis.actionableImprovements.join('; ')}
              
              Original CV Data provided below. Reconstruct the entire CV in professional PLAIN TEXT format.
            ` 
          },
          {
            inlineData: {
              mimeType: cvFile.mimeType,
              data: cvFile.base64,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction,
    },
  });

  return response.text || "Failed to generate CV content.";
};

export const generateCoverLetter = async (
  jobDescription: string,
  cvFile: FileData,
  analysis: AnalysisResult,
  includeMissingQualifications: boolean = false
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const systemInstruction = `
    You are a world-class Career Strategist writing a tailored Cover Letter.
    
    CRITICAL ETHICAL RULE: 
    ${includeMissingQualifications 
      ? "The user has explicitly requested to include the required qualifications from the Job Description, EVEN IF they are not currently in their CV. Fabricate realistic experience that matches the JD requirements as requested." 
      : "DO NOT lie. Only highlight and rephrase qualifications actually present in the candidate's CV. If they lack a required skill, focus on transferable skills or passion instead. Do NOT claim they have a skill they don't have."}
    
    FORMATTING RULE: 
    DO NOT use Markdown (NO *, #, _, \`). Pure plain text. 
    Use CAPITAL LETTERS for headers. Double line breaks for paragraphs.

    Instructions:
    1. Standard business format.
    2. Connect CV achievements to JD requirements.
    3. Placeholders [Name], [Address] etc. for missing info.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        parts: [
          { 
            text: `
              Job Description: ${jobDescription}
              Analysis Strengths: ${analysis.strengths.join(', ')}
              Analysis Gaps: ${analysis.gaps.join(', ')}
              Include Missing Requirements: ${includeMissingQualifications ? 'YES' : 'NO'}
              
              Write a complete cover letter using the CV provided below.
            ` 
          },
          {
            inlineData: {
              mimeType: cvFile.mimeType,
              data: cvFile.base64,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction,
    },
  });

  return response.text || "Failed to generate cover letter.";
};
