
import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  RefreshCcw, 
  Copy, 
  Check, 
  ClipboardList, 
  Sparkles,
  X,
  FileSearch,
  Save,
  History,
  Trash2,
  ChevronRight,
  Download,
  Type as TypeIcon,
  PenTool,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart3,
  Quote
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { analyzeResume, generateOptimizedCV, generateCoverLetter } from './services/geminiService';
import { AnalysisResult, FileData, SavedAnalysis } from './types';
import MatchScore from './components/MatchScore';

const STORAGE_KEY = 'cv_scout_saved_analyses';

const DocumentViewer = ({ file }: { file: FileData }) => {
  const dataUrl = `data:${file.mimeType};base64,${file.base64}`;
  
  if (file.mimeType === 'text/plain') {
    let decodedText = "";
    try {
      decodedText = atob(file.base64);
    } catch (e) {
      decodedText = "Error decoding text content.";
    }
    return (
      <div className="bg-white rounded-xl p-6 h-full overflow-auto border border-slate-200 shadow-inner">
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
          {decodedText}
        </pre>
      </div>
    );
  }

  if (file.mimeType.includes('image')) {
    return (
      <div className="bg-slate-100 rounded-xl p-2 h-full overflow-auto flex items-start justify-center">
        <img 
          src={dataUrl} 
          alt="CV Preview" 
          className="max-w-full h-auto rounded-lg shadow-md border border-slate-200 transition-transform hover:scale-[1.02]" 
        />
      </div>
    );
  }
  
  return (
    <div className="bg-slate-200 rounded-xl h-full overflow-hidden border border-slate-300 shadow-inner relative group">
      <object
        data={`${dataUrl}#view=FitH&scrollbar=1&toolbar=1`}
        type="application/pdf"
        className="w-full h-full min-h-[600px]"
      >
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
          <FileText className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Unable to display PDF directly.</p>
          <a 
            href={dataUrl} 
            download={file.name}
            className="mt-4 text-blue-600 underline text-sm"
          >
            Download to view
          </a>
        </div>
      </object>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-slate-800/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
          Use browser controls to zoom
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [cvMode, setCvMode] = useState<'upload' | 'text'>('upload');
  const [pastedCv, setPastedCv] = useState('');
  const [file, setFile] = useState<FileData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCV, setIsGeneratingCV] = useState(false);
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const [enhanceCL, setEnhanceCL] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [optimizedCV, setOptimizedCV] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCV, setCopiedCV] = useState(false);
  const [copiedCL, setCopiedCL] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showCVModal, setShowCVModal] = useState(false);
  const [showCLModal, setShowCLModal] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setFile({
          base64: base64String,
          mimeType: selectedFile.type,
          name: selectedFile.name,
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    let finalFile = file;

    if (cvMode === 'text') {
      if (!pastedCv.trim()) {
        setError("Please paste your CV content.");
        return;
      }
      const base64Text = btoa(unescape(encodeURIComponent(pastedCv)));
      finalFile = {
        base64: base64Text,
        mimeType: 'text/plain',
        name: 'Pasted_CV.txt'
      };
      setFile(finalFile);
    }

    if (!jobDescription || !finalFile) {
      setError("Please provide both a job description and your CV.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIsSaved(false);
    try {
      const analysisResult = await analyzeResume(jobDescription, finalFile);
      setResult(analysisResult);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze resume. Please try a different file.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalysis = () => {
    if (!result || !file || isSaved) return;

    const newSaved: SavedAnalysis = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      jobDescription,
      file,
      result
    };

    const updatedHistory = [newSaved, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    setIsSaved(true);
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleLoadHistory = (item: SavedAnalysis) => {
    setResult(item.result);
    setFile(item.file);
    setJobDescription(item.jobDescription);
    if (item.file.mimeType === 'text/plain') {
      setCvMode('text');
      setPastedCv(atob(item.file.base64));
    } else {
      setCvMode('upload');
    }
    setIsSaved(true);
  };

  const handleGenerateOptimizedCV = async () => {
    if (!result || !file || !jobDescription) return;

    setIsGeneratingCV(true);
    setError(null);
    try {
      const cvContent = await generateOptimizedCV(jobDescription, file, result);
      setOptimizedCV(cvContent);
      setShowCVModal(true);
    } catch (err) {
      console.error(err);
      setError("Failed to generate optimized CV.");
    } finally {
      setIsGeneratingCV(false);
    }
  };

  const handleGenerateCL = async (forceEnhance: boolean = false) => {
    if (!result || !file || !jobDescription) return;

    setIsGeneratingCL(true);
    setError(null);
    try {
      const clContent = await generateCoverLetter(jobDescription, file, result, forceEnhance);
      setCoverLetter(clContent);
      setShowCLModal(true);
    } catch (err) {
      console.error(err);
      setError("Failed to generate cover letter.");
    } finally {
      setIsGeneratingCL(false);
    }
  };

  const handleDownloadPDF = (content: string, title: string) => {
    if (!content) return;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = pageWidth - (margin * 2);
    const lines = doc.splitTextToSize(content, textWidth);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let y = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    const lineHeight = 6;
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
    const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "Document";
    doc.save(`${baseName}_${title}.pdf`);
  };

  const copyToClipboard = (text: string, type: 'summary' | 'all' | 'cv' | 'cl') => {
    navigator.clipboard.writeText(text);
    if (type === 'summary') {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } else if (type === 'all') {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } else if (type === 'cv') {
      setCopiedCV(true);
      setTimeout(() => setCopiedCV(false), 2000);
    } else if (type === 'cl') {
      setCopiedCL(true);
      setTimeout(() => setCopiedCL(false), 2000);
    }
  };

  const handleCopyAll = () => {
    if (!result) return;
    const text = `
CV SCOUT ANALYSIS REPORT
------------------------
Match Score: ${result.matchScore}%

PROFESSIONAL VERDICT:
${result.summary}

OPTIMIZED PROFESSIONAL SUMMARY:
"${result.generatedProfessionalSummary}"

KEY STRENGTHS:
${result.strengths.map(s => `- ${s}`).join('\n')}

MAJOR GAPS:
${result.gaps.map(g => `- ${g}`).join('\n')}

MISSING KEYWORDS:
${result.missingKeywords.join(', ')}

ACTIONABLE IMPROVEMENTS:
${result.actionableImprovements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

EXPERIENCE OPTIMIZATION (BULLET POINTS):
${result.suggestedBulletPoints.map(bp => `
Original: "${bp.original}"
Improved: "${bp.improved}"
Reason: ${bp.reason}
`).join('\n')}
    `.trim();
    copyToClipboard(text, 'all');
  };

  const reset = () => {
    setResult(null);
    setOptimizedCV(null);
    setCoverLetter(null);
    setError(null);
    setJobDescription('');
    setFile(null);
    setPastedCv('');
    setIsSaved(false);
    setEnhanceCL(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={reset}>
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
              <FileText className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">CV Scout</h1>
          </div>
          {result && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`hidden md:flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${showPreview ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <FileSearch className="w-4 h-4" />
                <span>{showPreview ? 'FOCUS RESULTS' : 'SHOW PREVIEW'}</span>
              </button>
              <button
                onClick={reset}
                className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-all hover:shadow-md active:scale-95"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>NEW ANALYSIS</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 mt-12 ${result ? '' : 'max-w-5xl'}`}>
        {!result ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black tracking-widest uppercase mb-6">
                Powered by Gemini 3 Pro
              </div>
              <h2 className="text-4xl font-black text-slate-900 sm:text-5xl mb-6 tracking-tight">
                Benchmark your CV <br className="hidden sm:block" />
                <span className="text-blue-600">against any job description</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Get high-impact rewrites, identify skill gaps, and generate perfectly tailored cover letters in seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col group">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-sm font-black text-slate-800 flex items-center tracking-tight">
                    <span className="bg-blue-600 text-white w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs mr-3 font-bold shadow-md shadow-blue-200">1</span>
                    JOB DESCRIPTION
                  </label>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-focus-within:text-blue-500 transition-colors">Paste Details</div>
                </div>
                <textarea
                  className="w-full flex-1 min-h-[350px] p-6 text-sm border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none font-sans bg-slate-50/30 hover:bg-slate-50/80"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col group">
                <div className="flex justify-between items-center mb-6">
                  <label className="text-sm font-black text-slate-800 flex items-center tracking-tight">
                    <span className="bg-blue-600 text-white w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs mr-3 font-bold shadow-md shadow-blue-200">2</span>
                    YOUR CV
                  </label>
                  <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
                    <button 
                      onClick={() => setCvMode('upload')}
                      className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${cvMode === 'upload' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>UPLOAD</span>
                    </button>
                    <button 
                      onClick={() => setCvMode('text')}
                      className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${cvMode === 'text' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <TypeIcon className="w-3 h-3" />
                      <span>PASTE</span>
                    </button>
                  </div>
                </div>

                {cvMode === 'upload' ? (
                  <div className="relative group border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl transition-all flex-1 min-h-[350px] flex flex-col items-center justify-center bg-slate-50/30">
                    <input
                      type="file"
                      accept=".pdf,image/png"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {file && file.mimeType !== 'text/plain' ? (
                      <div className="text-center p-6 animate-in zoom-in-95 duration-300">
                        <div className="bg-emerald-500 p-4 rounded-2xl inline-block mb-4 shadow-xl shadow-emerald-200">
                          <CheckCircle className="text-white w-10 h-10" />
                        </div>
                        <p className="font-black text-slate-800 text-lg break-all px-4 truncate max-w-xs">{file.name}</p>
                        <p className="text-[10px] text-emerald-600 mt-2 uppercase tracking-[0.2em] font-black">Document Locked</p>
                      </div>
                    ) : (
                      <div className="text-center p-6">
                        <div className="bg-slate-100 p-5 rounded-3xl inline-block mb-4 group-hover:bg-blue-100 transition-all transform group-hover:-translate-y-1">
                          <Upload className="text-slate-400 group-hover:text-blue-600 w-10 h-10" />
                        </div>
                        <p className="font-bold text-slate-800 text-lg">Drop your CV here</p>
                        <p className="text-sm text-slate-400 mt-2">Support for PDF or PNG formats</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    className="w-full flex-1 min-h-[350px] p-6 text-sm border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none font-sans bg-slate-50/30 hover:bg-slate-50/80"
                    placeholder="Paste your resume text here..."
                    value={pastedCv}
                    onChange={(e) => setPastedCv(e.target.value)}
                  />
                )}
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center text-rose-700 animate-in slide-in-from-top-4 mx-auto max-w-2xl shadow-lg shadow-rose-100">
                <AlertCircle className="w-6 h-6 mr-4 flex-shrink-0 text-rose-500" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            <div className="flex justify-center pt-8">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !jobDescription || (cvMode === 'upload' ? !file : !pastedCv)}
                className={`group flex items-center space-x-3 px-16 py-6 rounded-full font-black text-xl shadow-2xl transition-all active:scale-95 ${isAnalyzing || !jobDescription || (cvMode === 'upload' ? !file : !pastedCv) ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-300 transform hover:-translate-y-1'}`}
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-7 h-7 animate-spin mr-2" /><span>ANALYZING...</span></>
                ) : (
                  <><span className="mr-2">SCAN RESUME</span><ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </div>

            {history.length > 0 && (
              <div className="mt-24 animate-in slide-in-from-bottom-8 duration-1000">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-slate-200 rounded-2xl"><History className="w-6 h-6 text-slate-600" /></div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase text-sm">RECENT SCANS</h3>
                  </div>
                  <div className="h-px flex-1 bg-slate-200 ml-6"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map((item) => (
                    <div key={item.id} onClick={() => handleLoadHistory(item)} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center space-x-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${item.result.matchScore >= 75 ? 'bg-emerald-50 text-emerald-600' : item.result.matchScore >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>{item.result.matchScore}%</div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                         </div>
                         <button onClick={(e) => handleDeleteHistory(item.id, e)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <p className="text-sm font-black text-slate-800 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.jobDescription.split('\n')[0] || 'Saved Analysis'}</p>
                      <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                         {item.file.mimeType === 'text/plain' ? <TypeIcon className="w-3 h-3 mr-2" /> : <FileText className="w-3 h-3 mr-2" />}
                         <span className="truncate max-w-[150px]">{item.file.name}</span>
                      </div>
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0"><ChevronRight className="w-6 h-6 text-blue-600" /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            {/* Action Bar */}
            <div className="flex flex-col xl:flex-row gap-6 justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-24 z-30">
               <div className="flex items-center space-x-4 text-slate-700 w-full xl:w-auto">
                 <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200"><Sparkles className="w-6 h-6 text-white" /></div>
                 <div>
                    <span className="font-black text-lg block leading-none tracking-tight">ANALYSIS REPORT</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 block">CV Scout Intelligence v2</span>
                 </div>
               </div>
               <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                 <button onClick={handleSaveAnalysis} className={`flex-1 xl:flex-none flex items-center justify-center space-x-2 px-6 py-3 font-black rounded-2xl transition-all border text-xs tracking-widest ${isSaved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                   {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                   <span>{isSaved ? "SAVED" : "SAVE SESSION"}</span>
                 </button>
                 <button onClick={handleGenerateOptimizedCV} disabled={isGeneratingCV} className="flex-1 xl:flex-none flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 text-xs tracking-widest shadow-lg shadow-blue-200">
                   {isGeneratingCV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                   <span>CV REWRITE</span>
                 </button>
                 <div className="flex-1 xl:flex-none flex items-center bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200/50">
                   <button 
                    onClick={() => handleGenerateCL(false)} 
                    disabled={isGeneratingCL} 
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 text-xs tracking-widest shadow-md"
                   >
                     {isGeneratingCL && !enhanceCL ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                     <span>COVER LETTER</span>
                   </button>
                   <button 
                    onClick={() => handleGenerateCL(true)} 
                    disabled={isGeneratingCL} 
                    title="Include missing qualifications (High Risk)"
                    className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-amber-500 text-white font-black rounded-r-xl hover:bg-amber-600 transition-all disabled:opacity-50 text-xs border-l border-amber-400/30"
                   >
                     {isGeneratingCL && enhanceCL ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                   </button>
                 </div>
                 <button onClick={handleCopyAll} className="flex-1 xl:flex-none flex items-center justify-center space-x-2 px-6 py-3 border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all text-xs tracking-widest">
                   {copiedAll ? <Check className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                   <span>COPY REPORT</span>
                 </button>
               </div>
            </div>

            <div className={`grid grid-cols-1 ${showPreview ? 'lg:grid-cols-12' : 'lg:grid-cols-3'} gap-8 items-start`}>
              <div className={`space-y-10 ${showPreview ? 'lg:col-span-7' : 'lg:col-span-3'}`}>
                {/* Score Section */}
                <div className={`${showPreview ? '' : 'hidden lg:block'} bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100`}>
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-shrink-0">
                      <MatchScore score={result.matchScore} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black tracking-widest uppercase mb-4">
                        <BarChart3 className="w-3 h-3 mr-2" />
                        Executive Verdict
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight leading-tight">
                        {result.matchScore >= 80 ? 'Exceptional Fit' : result.matchScore >= 50 ? 'Strong Contender' : 'Major Adjustments Needed'}
                      </h3>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">
                        {result.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Professional Summary Rewrite */}
                <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl"></div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-xl"><Target className="w-5 h-5 text-blue-400" /></div>
                      <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase">TAILORED PROFILE HEADER</h3>
                    </div>
                    <button onClick={() => copyToClipboard(result.generatedProfessionalSummary, 'summary')} className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all text-[10px] font-black tracking-widest uppercase border border-white/10">
                      {copiedSummary ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSummary ? 'COPIED' : 'COPY TEXT'}</span>
                    </button>
                  </div>
                  
                  <div className="relative z-10">
                    <Quote className="w-10 h-10 text-blue-500/30 mb-2 -ml-2" />
                    <p className="text-white text-xl md:text-2xl font-bold leading-relaxed tracking-tight italic">
                      {result.generatedProfessionalSummary}
                    </p>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                    <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Placement recommendation: TOP OF CV</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                      <div className="w-1 h-1 rounded-full bg-blue-500/50"></div>
                      <div className="w-1 h-1 rounded-full bg-blue-500/20"></div>
                    </div>
                  </div>
                </div>

                {/* Gaps and Strengths Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100 flex flex-col">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-emerald-50 rounded-xl"><CheckCircle className="w-5 h-5 text-emerald-500" /></div>
                      <h3 className="text-xs font-black text-slate-800 tracking-[0.2em] uppercase">KEY ASSETS</h3>
                    </div>
                    <ul className="space-y-4 flex-1">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start group">
                          <div className="w-5 h-5 bg-emerald-100 rounded-full flex-shrink-0 flex items-center justify-center mr-3 mt-0.5 group-hover:bg-emerald-500 transition-colors">
                            <Check className="w-3 h-3 text-emerald-600 group-hover:text-white" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100 flex flex-col">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-rose-50 rounded-xl"><XCircle className="w-5 h-5 text-rose-500" /></div>
                      <h3 className="text-xs font-black text-slate-800 tracking-[0.2em] uppercase">CRITICAL GAPS</h3>
                    </div>
                    <ul className="space-y-4 flex-1">
                      {result.gaps.map((g, i) => (
                        <li key={i} className="flex items-start group">
                          <div className="w-5 h-5 bg-rose-100 rounded-full flex-shrink-0 flex items-center justify-center mr-3 mt-0.5 group-hover:bg-rose-500 transition-colors">
                            <X className="w-3 h-3 text-rose-600 group-hover:text-white" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 leading-snug">{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Missing Keywords */}
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-amber-50 rounded-xl"><AlertCircle className="w-5 h-5 text-amber-500" /></div>
                    <h3 className="text-xs font-black text-slate-800 tracking-[0.2em] uppercase">HIGH-IMPORTANCE KEYWORDS</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((k, i) => (
                      <span key={i} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black tracking-tight border border-slate-200 hover:bg-white hover:border-blue-300 transition-all cursor-default hover:text-blue-600">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Improvements List */}
                <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="p-2 bg-blue-50 rounded-xl"><Lightbulb className="w-5 h-5 text-blue-600" /></div>
                    <h3 className="text-xs font-black text-slate-800 tracking-[0.2em] uppercase">STRATEGIC ENHANCEMENTS</h3>
                  </div>
                  <div className="space-y-8">
                    {result.actionableImprovements.map((imp, i) => (
                      <div key={i} className="flex items-start group">
                        <div className="bg-slate-100 text-slate-400 font-black p-2 rounded-xl text-[10px] mr-6 flex-shrink-0 w-8 h-8 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          {i + 1}
                        </div>
                        <p className="text-slate-700 text-base leading-relaxed font-semibold pt-1">{imp}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bullet Points Section */}
                <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100 overflow-hidden relative">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="p-2 bg-indigo-50 rounded-xl"><Sparkles className="w-5 h-5 text-indigo-600" /></div>
                    <h3 className="text-xs font-black text-slate-800 tracking-[0.2em] uppercase">EXPERIENCE OPTIMIZATION</h3>
                  </div>
                  <div className="space-y-12">
                    {result.suggestedBulletPoints.map((bp, i) => (
                      <div key={i} className="group relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-100 group-hover:bg-indigo-500 transition-colors rounded-full" />
                        <div className="pl-8 space-y-6">
                          <div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] block mb-3">ORIGINAL PHRASING</span>
                            <p className="text-sm text-slate-400 italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                              "{bp.original}"
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] block">ENHANCED VERSION</span>
                              <div className="h-px flex-1 bg-indigo-100"></div>
                            </div>
                            <p className="text-slate-800 font-black text-xl leading-tight tracking-tight">
                              "{bp.improved}"
                            </p>
                          </div>
                          <div className="flex items-start space-x-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                            <Lightbulb className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" />
                            <p className="text-xs text-indigo-900 leading-relaxed font-bold">
                              {bp.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sticky Sidebar Preview */}
              {showPreview && file && (
                <div className="hidden lg:block lg:col-span-5 sticky top-36 h-[calc(100vh-180px)]">
                  <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-slate-100 p-2 rounded-xl">
                          <FileSearch className="w-5 h-5 text-slate-600" />
                        </div>
                        <h3 className="font-black text-slate-800 text-xs truncate max-w-[200px] tracking-tight uppercase">
                          {file.name}
                        </h3>
                      </div>
                      <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 mr-3 tracking-widest uppercase">MATCH</span>
                        <span className={`text-sm font-black ${result.matchScore >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>{result.matchScore}%</span>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 bg-slate-50/50 rounded-2xl overflow-hidden shadow-inner border border-slate-100">
                      <DocumentViewer file={file} />
                    </div>
                    <div className="mt-6 flex justify-between items-center px-2">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">LIVE ANALYSIS FEED</p>
                       <button onClick={() => setShowPreview(false)} className="text-[10px] text-blue-600 font-black uppercase tracking-widest hover:text-blue-800 transition-colors hover:underline underline-offset-4">HIDE PREVIEW</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CV Modal */}
      {showCVModal && optimizedCV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-200"><Sparkles className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase text-sm">REWRITTEN RESUME</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Optimized Content</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={() => handleDownloadPDF(optimizedCV, 'REWRITE')} className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all text-xs font-black tracking-widest uppercase shadow-xl shadow-emerald-200">
                  <Download className="w-4 h-4" />
                  <span>SAVE AS PDF</span>
                </button>
                <button onClick={() => copyToClipboard(optimizedCV, 'cv')} className="flex items-center space-x-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl text-xs font-black tracking-widest uppercase transition-all border border-blue-100">
                  {copiedCV ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCV ? 'COPIED' : 'COPY TEXT'}</span>
                </button>
                <button onClick={() => setShowCVModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 bg-slate-100/30 flex justify-center">
              <div className="bg-white shadow-2xl border border-slate-200 rounded-3xl p-16 max-w-[850px] w-full min-h-full transition-all">
                <pre className="whitespace-pre-wrap font-sans text-slate-800 text-base leading-relaxed selection:bg-blue-100">
                  {optimizedCV}
                </pre>
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-white flex justify-end">
              <button onClick={() => setShowCVModal(false)} className="px-12 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs">
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CL Modal */}
      {showCLModal && coverLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-200"><PenTool className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase text-sm">COVER LETTER</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Personalized Pitch</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={() => handleDownloadPDF(coverLetter, 'COVER_LETTER')} className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all text-xs font-black tracking-widest uppercase shadow-xl shadow-emerald-200">
                  <Download className="w-4 h-4" />
                  <span>SAVE AS PDF</span>
                </button>
                <button onClick={() => copyToClipboard(coverLetter, 'cl')} className="flex items-center space-x-2 px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-black tracking-widest uppercase transition-all border border-indigo-100">
                  {copiedCL ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCL ? 'COPIED' : 'COPY TEXT'}</span>
                </button>
                <button onClick={() => setShowCLModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 bg-slate-100/30 flex flex-col items-center">
              <div className="max-w-[850px] w-full mb-10">
                <div className="bg-amber-50 border border-amber-200 rounded-[30px] p-6 flex flex-col sm:flex-row items-center justify-between text-amber-900 shadow-lg shadow-amber-100/50">
                  <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                    <div className="p-2 bg-amber-100 rounded-xl"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                    <div>
                      <span className="text-sm font-black uppercase tracking-tight">ENHANCEMENT MODE</span>
                      <p className="text-[10px] font-bold text-amber-700/70 leading-none mt-1">Fabricate missing skills to bridge major gaps?</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setEnhanceCL(!enhanceCL);
                      handleGenerateCL(!enhanceCL);
                    }}
                    className={`flex items-center space-x-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${enhanceCL ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-100'}`}
                  >
                    {enhanceCL ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    <span>{enhanceCL ? 'ENABLED' : 'DISABLED'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-white shadow-2xl border border-slate-200 rounded-3xl p-16 max-w-[850px] w-full min-h-full transition-all">
                <pre className="whitespace-pre-wrap font-sans text-slate-800 text-base leading-relaxed">
                  {coverLetter}
                </pre>
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-white flex justify-end">
              <button onClick={() => setShowCLModal(false)} className="px-12 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs">
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-32 border-t border-slate-200 py-16 bg-white text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center space-x-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
            <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
            PRECISION AI ANALYSIS • CV SCOUT PROFESSIONAL • 2025
          </p>
          <div className="mt-8 flex justify-center space-x-8 text-slate-300">
            <BarChart3 className="w-5 h-5" />
            <Sparkles className="w-5 h-5" />
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </footer>
    </div>
  );
};

// Simple Shield icon placeholder as it was not imported
const Shield = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

export default App;
