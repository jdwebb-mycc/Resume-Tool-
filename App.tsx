
import React, { useState, useMemo, useCallback } from 'react';
import { ResumeData, SingleDutyAnalysis, WorkExperience, Project, SuggestedDuty } from './types';
import { programCerts } from './constants';
import { PersonalDetailsForm, EducationForm } from './components/ResumeForm';
import ResumePreview from './components/ResumePreview';
import SetupScreen from './components/SetupScreen';
import RubricModal from './components/RubricModal';
import ProjectGenerator from './components/ProjectGenerator';
import SkillsEditor from './components/SkillsEditor';
import { analyzeSingleDuty, generateResumeSummaryAndSkills, generateSuggestedDuties, generateProjects, generateSkills, analyzeResumeAlignment } from './services/geminiService';
import { AlignmentAnalysis } from './types';
import { formatResumeAsText, generateDocxBlob, downloadBlob } from './services/exportService';
import { BinaryIcon, PlusIcon, TrashIcon, XMarkIcon, SparklesIcon, DocumentArrowDownIcon, ClipboardIcon, PrinterIcon, LightBulbIcon, SettingsIcon } from './components/Icons';

const initialResumeData: ResumeData = {
  personalDetails: { fullName: '', email: '', phoneNumber: '', linkedin: '', website: '' },
  experience: [],
  education: [],
  projects: [],
  skills: '',
  summary: '',
};

interface WorkshopState {
    currentDuty: string;
    analysisResult: SingleDutyAnalysis | null;
    isLoading: boolean;
    error: string | null;
    suggestedDuties: SuggestedDuty[];
    isGeneratingDuties: boolean;
    suggestionsError: string | null;
}

const initialWorkshopState: WorkshopState = {
    currentDuty: '',
    analysisResult: null,
    isLoading: false,
    error: null,
    suggestedDuties: [],
    isGeneratingDuties: false,
    suggestionsError: null,
};



export default function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);
  const [jobDescription, setJobDescription] = useState('');
  
  // --- Global Context State ---
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [program, setProgram] = useState('');
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('');

  // --- Workshop-specific state ---
  const [activeExperienceId, setActiveExperienceId] = useState<number | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [workshopStates, setWorkshopStates] = useState<Record<number, WorkshopState>>({});
  const [projectWorkshopStates, setProjectWorkshopStates] = useState<Record<number, WorkshopState>>({});

  // --- Export State ---
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  
  // --- Project Generator State ---
  const [generatedProjects, setGeneratedProjects] = useState<Project[]>([]);
  const [isGeneratingProjects, setIsGeneratingProjects] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  
  // --- Alignment Analysis State ---
  const [alignmentAnalysis, setAlignmentAnalysis] = useState<AlignmentAnalysis | null>(null);
  const [isAnalyzingAlignment, setIsAnalyzingAlignment] = useState(false);
  const [alignmentError, setAlignmentError] = useState<string | null>(null);
  
  const activeWorkshopState = activeExperienceId ? workshopStates[activeExperienceId] : null;
  const setActiveWorkshopState = (newState: Partial<WorkshopState>) => {
    if (activeExperienceId) {
        setWorkshopStates(prev => ({
            ...prev,
            [activeExperienceId]: { ...prev[activeExperienceId], ...newState }
        }));
    }
  };

  const activeProjectWorkshopState = activeProjectId ? projectWorkshopStates[activeProjectId] : null;
  const setActiveProjectWorkshopState = (newState: Partial<WorkshopState>) => {
    if (activeProjectId) {
        setProjectWorkshopStates(prev => ({
            ...prev,
            [activeProjectId]: { ...prev[activeProjectId], ...newState }
        }));
    }
  };

  const fetchSuggestedDuties = async (experienceId: number) => {
      const experience = resumeData.experience.find(exp => exp.id === experienceId);
      if (!experience) return;
      
      setWorkshopStates(prev => ({ ...prev, [experienceId]: { ...prev[experienceId], isGeneratingDuties: true, suggestedDuties: [], suggestionsError: null } }));

      try {
          const duties = await generateSuggestedDuties(program, selectedCerts, experienceLevel, experience.jobTitle, jobDescription);
          setWorkshopStates(prev => ({ ...prev, [experienceId]: { ...prev[experienceId], suggestedDuties: duties } }));
      } catch (e) {
          console.error("Failed to fetch duty suggestions:", e);
           setWorkshopStates(prev => ({ ...prev, [experienceId]: { ...prev[experienceId], suggestionsError: 'Failed to load suggestions. Please try again.' } }));
      } finally {
          setWorkshopStates(prev => ({ ...prev, [experienceId]: { ...prev[experienceId], isGeneratingDuties: false } }));
      }
  };

  const handleActivateWorkshop = (id: number) => {
      setActiveExperienceId(id);
      if (!workshopStates[id]?.suggestedDuties.length && !workshopStates[id]?.isGeneratingDuties) {
          fetchSuggestedDuties(id);
      }
  };

  const handleActivateProjectWorkshop = (id: number) => {
      setActiveProjectId(id);
      if (!projectWorkshopStates[id]) {
          setProjectWorkshopStates(prev => ({ ...prev, [id]: { ...initialWorkshopState } }));
      }
  };

  const handleSetupComplete = (program: string, certs: string[], parsedData: ResumeData, jd: string, expLevel: string) => {
      setProgram(program);
      setSelectedCerts(certs);
      setResumeData(parsedData);
      setJobDescription(jd);
      setExperienceLevel(expLevel);
      
      const initialStates = parsedData.experience.reduce((acc, exp) => {
        acc[exp.id] = { ...initialWorkshopState };
        return acc;
      }, {} as Record<number, WorkshopState>);
      setWorkshopStates(initialStates);

      setIsSetupComplete(true);
  };
  
  const addExperience = () => {
    const newId = Date.now();
    const newExperience: WorkExperience = { id: newId, jobTitle: 'IT Professional', company: 'Various Companies', startDate: '', endDate: 'Present', responsibilities: [] };
    setResumeData(prev => ({ ...prev, experience: [...prev.experience, newExperience] }));
    setWorkshopStates(prev => ({ ...prev, [newId]: { ...initialWorkshopState } }));
    handleActivateWorkshop(newId);
  };

  const removeExperience = (id: number) => {
    setResumeData(prev => ({ ...prev, experience: prev.experience.filter(exp => exp.id !== id) }));
    setWorkshopStates(prev => {
        const newStates = { ...prev };
        delete newStates[id];
        return newStates;
    });
    if (activeExperienceId === id) {
        setActiveExperienceId(null);
    }
  };
  
  const handlePersonalDetailsChange = useCallback((details: ResumeData['personalDetails']) => {
    setResumeData(prev => ({ ...prev, personalDetails: details }));
  }, []);

  const handleEducationChange = useCallback((education: ResumeData['education']) => {
    setResumeData(prev => ({ ...prev, education }));
  }, []);

  const handleExperienceDetailsChange = useCallback((id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResumeData(prev => ({ ...prev, experience: prev.experience.map(exp => exp.id === id ? { ...exp, [name]: value } : exp) }));
  }, []);

  const handleProjectDetailsChange = useCallback((id: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setResumeData(prev => ({
        ...prev,
        projects: prev.projects.map(proj => proj.id === id ? { ...proj, [name]: value } : proj)
    }));
  }, []);

  const addProject = useCallback(() => {
    setResumeData(prev => ({
        ...prev,
        projects: [...prev.projects, { id: Date.now(), title: '', description: '' }]
    }));
  }, []);

  const removeProject = useCallback((id: number) => {
    setResumeData(prev => ({
        ...prev,
        projects: prev.projects.filter(proj => proj.id !== id)
    }));
  }, []);

  const handleAnalyzeDuty = useCallback(async () => {
    if (!activeExperienceId || !activeWorkshopState?.currentDuty.trim()) return;
    setActiveWorkshopState({ isLoading: true, error: null, analysisResult: null });
    try {
        const result = await analyzeSingleDuty(activeWorkshopState.currentDuty, selectedCerts, experienceLevel, jobDescription);
        setActiveWorkshopState({ analysisResult: result });
    } catch (e) {
        setActiveWorkshopState({ error: 'Failed to analyze duty. Please try again.' });
        console.error(e);
    } finally {
        setActiveWorkshopState({ isLoading: false });
    }
  }, [activeExperienceId, activeWorkshopState, selectedCerts, experienceLevel, jobDescription]);

  const removeResponsibility = useCallback((experienceId: number, responsibility: string) => {
    setResumeData(prev => ({
        ...prev,
        experience: prev.experience.map(exp => 
            exp.id === experienceId 
                ? { ...exp, responsibilities: exp.responsibilities.filter(r => r !== responsibility) }
                : exp
        )
    }));
  }, []);

  const handleAnalyzeProject = useCallback(async () => {
    if (!activeProjectId || !activeProjectWorkshopState?.currentDuty.trim()) return;
    setActiveProjectWorkshopState({ isLoading: true, error: null, analysisResult: null });
    try {
        const result = await analyzeSingleDuty(activeProjectWorkshopState.currentDuty, selectedCerts, experienceLevel, jobDescription);
        setActiveProjectWorkshopState({ analysisResult: result });
    } catch (e) {
        setActiveProjectWorkshopState({ error: 'Failed to analyze project. Please try again.' });
        console.error(e);
    } finally {
        setActiveProjectWorkshopState({ isLoading: false });
    }
  }, [activeProjectId, activeProjectWorkshopState, selectedCerts, experienceLevel, jobDescription]);

  const handleBulletSelection = useCallback((bullet: string, isSelected: boolean) => {
    if (!activeExperienceId) return;
    setResumeData(prev => ({
        ...prev,
        experience: prev.experience.map(exp => {
            if (exp.id !== activeExperienceId) return exp;
            const newResponsibilities = isSelected ? [...exp.responsibilities, bullet] : exp.responsibilities.filter(r => r !== bullet);
            return { ...exp, responsibilities: newResponsibilities };
        })
    }));
  }, [activeExperienceId]);

  const handleProjectBulletSelection = useCallback((bullet: string) => {
    if (!activeProjectId) return;
    setResumeData(prev => ({
        ...prev,
        projects: prev.projects.map(proj => {
            if (proj.id !== activeProjectId) return proj;
            return { ...proj, description: bullet };
        })
    }));
  }, [activeProjectId]);

  const handleClearWorkshop = useCallback(() => {
      setActiveWorkshopState({ currentDuty: '', analysisResult: null, error: null });
  }, [activeExperienceId]);

  const handleClearProjectWorkshop = useCallback(() => {
      setActiveProjectWorkshopState({ currentDuty: '', analysisResult: null, error: null });
  }, [activeProjectId]);
  
  const handleGenerateSummarySkills = useCallback(async () => {
      const allBullets = resumeData.experience.flatMap(exp => exp.responsibilities);
      if (allBullets.length === 0) return;
      try {
          const { summary, skills } = await generateResumeSummaryAndSkills(allBullets, jobDescription, selectedCerts);
          setResumeData(prev => ({ ...prev, summary, skills }));
      } catch (e) {
          console.error("Failed to generate summary/skills", e);
      }
  }, [resumeData.experience, jobDescription, selectedCerts]);

  const handleDownloadDocx = useCallback(async () => {
      setIsDownloading(true);
      try {
          const blob = await generateDocxBlob(resumeData);
          downloadBlob(blob, `${resumeData.personalDetails.fullName || 'Resume'}_Resume.docx`);
      } catch (e) {
          console.error("Failed to generate DOCX:", e);
          alert("Failed to generate resume document. Please try again.");
      } finally {
          setIsDownloading(false);
      }
  }, [resumeData]);

  const handleCopyText = useCallback(() => {
      const text = formatResumeAsText(resumeData);
      navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
  }, [resumeData]);

  const handleAddSuggestedDuty = useCallback((experienceId: number, duty: string) => {
    setResumeData(prev => ({
        ...prev,
        experience: prev.experience.map(exp => 
            exp.id === experienceId
                ? { ...exp, responsibilities: [...exp.responsibilities, duty] }
                : exp
        )
    }));
  }, []);
  
  const handleRubricComplete = useCallback(() => {
      setIsRubricModalOpen(false);
      setIsExportModalOpen(true);
  }, []);

  const handleAddGeneratedProject = useCallback((project: Project) => {
      const newProject = {
          id: Date.now(),
          title: project.title,
          description: project.resumeBullet, 
      };
      setResumeData(prev => ({
          ...prev,
          projects: [...prev.projects, newProject]
      }));
  }, []);

  const handleRemoveGeneratedProject = useCallback((title: string) => {
      setResumeData(prev => ({
          ...prev,
          projects: prev.projects.filter(proj => proj.title !== title)
      }));
  }, []);

  const handleGenerateProjects = useCallback(async (cert: string, level: string) => {
      setIsGeneratingProjects(true);
      setGeneratedProjects([]); 
      try {
          const projects = await generateProjects(cert, level, jobDescription);
          setGeneratedProjects(projects);
      } catch (e) {
          console.error("Failed to generate projects:", e);
      } finally {
          setIsGeneratingProjects(false);
      }
  }, [jobDescription]);

  const handleGenerateSkills = useCallback(async () => {
    setIsGeneratingSkills(true);
    try {
      const skills = await generateSkills(resumeData, jobDescription, selectedCerts);
      setSuggestedSkills(skills);
    } catch (e) {
      console.error("Failed to generate skills", e);
    } finally {
      setIsGeneratingSkills(false);
    }
  }, [resumeData, jobDescription, selectedCerts]);

  const handleSkillsChange = useCallback((skills: string) => {
    setResumeData(prev => ({ ...prev, skills }));
  }, []);

  const handleAnalyzeAlignment = useCallback(async () => {
    if (!jobDescription.trim()) {
      setAlignmentError("Please provide a job description first.");
      return;
    }
    setIsAnalyzingAlignment(true);
    setAlignmentError(null);
    try {
      const analysis = await analyzeResumeAlignment(resumeData, jobDescription);
      setAlignmentAnalysis(analysis);
    } catch (e) {
      console.error("Failed to analyze alignment:", e);
      setAlignmentError("Failed to analyze alignment. Please try again.");
    } finally {
      setIsAnalyzingAlignment(false);
    }
  }, [resumeData, jobDescription]);

  const selectedProjectTitles = useMemo(() => resumeData.projects.map(p => p.title), [resumeData.projects]);
  const allBullets = useMemo(() => resumeData.experience.flatMap(exp => exp.responsibilities), [resumeData.experience]);
  const inputClass = "block w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";
  
  if (!isSetupComplete) {
      return <SetupScreen onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @media print {
          .custom-scrollbar {
            overflow: visible !important;
            height: auto !important;
          }
        }
      `}</style>
      <header className="bg-white dark:bg-slate-800 shadow-md print:hidden sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">AI Resume Workshop</h1>
          <button onClick={() => setIsRubricModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            Export
          </button>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
        <div className="print:hidden space-y-6">
            {/* 1. Personal Details */}
            <PersonalDetailsForm personalDetails={resumeData.personalDetails} onDetailsChange={handlePersonalDetailsChange} />

            {/* 2. Professional Summary */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow space-y-4">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">Professional Summary</h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(resumeData.summary?.length || 0) >= 500 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {resumeData.summary?.length || 0}/500
                            </span>
                        </div>
                         <button onClick={handleGenerateSummarySkills} className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold disabled:opacity-50" disabled={allBullets.length === 0}> <SparklesIcon className="h-4 w-4 mr-1" /> Generate </button>
                    </div>
                    <textarea 
                        name="summary" 
                        rows={5} 
                        maxLength={500}
                        value={resumeData.summary} 
                        onChange={e => setResumeData(p => ({...p, summary: e.target.value}))} 
                        className={inputClass} 
                        placeholder='Add experience bullets and click "Generate" to create a summary.'
                    />
                </div>
            </div>

            {/* 3. Skills */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                 <SkillsEditor
                    skills={resumeData.skills}
                    onSkillsChange={handleSkillsChange}
                    suggestedSkills={suggestedSkills}
                    onGenerateSkills={handleGenerateSkills}
                    isGeneratingSkills={isGeneratingSkills}
                  />
            </div>

            {/* 4. Projects (Combined Generator & Workshop) */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Projects</h3>
                    <button onClick={addProject} className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"> <PlusIcon className="h-4 w-4 mr-1" /> Add Project </button>
                </div>
                
                <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <ProjectGenerator
                        programCerts={programCerts[program] || []}
                        experienceLevel={experienceLevel}
                        onGenerate={handleGenerateProjects}
                        projects={generatedProjects}
                        isLoading={isGeneratingProjects}
                        onAddProject={handleAddGeneratedProject}
                        onRemoveProject={handleRemoveGeneratedProject}
                        selectedProjectTitles={selectedProjectTitles}
                    />
                </div>

                <div className="space-y-4">
                    {resumeData.projects.map(proj => (
                        <div 
                             key={proj.id} 
                             className={`p-4 border rounded-md relative transition-all ${activeProjectId === proj.id ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'}`}
                        >
                             <button onClick={() => removeProject(proj.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 z-10"> <TrashIcon className="h-5 w-5" /> </button>
                             <div onClick={() => handleActivateProjectWorkshop(proj.id)} className="cursor-pointer">
                                 <input type="text" name="title" value={proj.title} onChange={e => handleProjectDetailsChange(proj.id, e)} className={`${inputClass} font-semibold`} placeholder="Project Title" />
                             </div>
                            {activeProjectId === proj.id && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                                    <div>
                                        <label className={labelClass}>Project Description / Bullet Point</label>
                                        <textarea rows={3} value={activeProjectWorkshopState?.currentDuty || proj.description} onChange={e => setActiveProjectWorkshopState({ currentDuty: e.target.value })} className={inputClass} placeholder="Describe what you did in this project..."/>
                                        <button onClick={handleAnalyzeProject} className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 flex items-center" disabled={!experienceLevel || !(activeProjectWorkshopState?.currentDuty || proj.description).trim() || activeProjectWorkshopState?.isLoading}>
                                            {activeProjectWorkshopState?.isLoading ? <SettingsIcon className="animate-spin h-5 w-5 mr-2" /> : <SparklesIcon className="h-5 w-5 mr-2" />} Analyze Project
                                        </button>
                                    </div>
                                    {activeProjectWorkshopState?.analysisResult && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                                        {activeProjectWorkshopState.analysisResult.isITDuty ? (
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2">Select the best bullet:</p>
                                                <div className="space-y-2">
                                                    {activeProjectWorkshopState.analysisResult.suggestedBullets?.map((bullet, i) => (
                                                        <label key={i} className="flex items-start p-3 bg-white dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700/50 hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer transition-colors">
                                                            <input type="radio" name={`project-bullet-${proj.id}`} className="mt-1 h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500" onChange={() => handleProjectBulletSelection(bullet)}/>
                                                            <span className="ml-3 text-sm text-slate-700 dark:text-slate-300">{bullet}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <button onClick={handleClearProjectWorkshop} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2">Try another description</button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-semibold text-sm text-red-600 dark:text-red-400">Not a qualifying IT project description.</p>
                                                <p className="text-sm"><span className="font-medium">Reasoning:</span> {activeProjectWorkshopState.analysisResult.reasoning}</p>
                                                <p className="text-sm"><span className="font-medium">Try This Instead:</span> {activeProjectWorkshopState.analysisResult.itEquivalent}</p>
                                                 <button onClick={handleClearProjectWorkshop} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2">Try again</button>
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                            )}
                            {activeProjectId !== proj.id && (
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{proj.description}</p>
                            )}
                        </div>
                    ))}
                    {resumeData.projects.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">No projects added yet. Use the generator above or click &quot;Add Project&quot;.</p>
                    )}
                </div>
            </div>

            {/* 5. Experience */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Experience</h3>
                    <button onClick={addExperience} className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"> <PlusIcon className="h-4 w-4 mr-1" /> Add Job </button>
                </div>
                 <div className="space-y-4">
                    {resumeData.experience.map(exp => (
                        <div 
                             key={exp.id} 
                             className={`p-4 border rounded-md relative transition-all ${activeExperienceId === exp.id ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'}`}
                        >
                             <button onClick={() => removeExperience(exp.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 z-10"> <TrashIcon className="h-5 w-5" /> </button>
                             <div onClick={() => handleActivateWorkshop(exp.id)} className="cursor-pointer">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <input type="text" name="jobTitle" value={exp.jobTitle} onChange={e => handleExperienceDetailsChange(exp.id, e)} className={`${inputClass} font-semibold`} />
                                     <input type="text" name="company" value={exp.company} onChange={e => handleExperienceDetailsChange(exp.id, e)} className={inputClass} />
                                 </div>
                             </div>
                            {activeExperienceId === exp.id && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                                    <div>
                                        <label className={labelClass}>Add a Work Duty to Enhance</label>
                                        <textarea rows={3} value={activeWorkshopState?.currentDuty} onChange={e => setActiveWorkshopState({ currentDuty: e.target.value })} className={inputClass} placeholder="e.g., Managed user accounts in Active Directory."/>
                                        <button onClick={handleAnalyzeDuty} className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 flex items-center" disabled={!experienceLevel || !activeWorkshopState?.currentDuty.trim() || activeWorkshopState.isLoading}>
                                            {activeWorkshopState.isLoading ? <SettingsIcon className="animate-spin h-5 w-5 mr-2" /> : <SparklesIcon className="h-5 w-5 mr-2" />} Analyze Duty
                                        </button>
                                    </div>
                                    {activeWorkshopState?.analysisResult && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                                        {activeWorkshopState.analysisResult.isITDuty ? (
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2">Select the best bullets:</p>
                                                <div className="space-y-2">
                                                    {activeWorkshopState.analysisResult.suggestedBullets?.map((bullet, i) => (
                                                        <label key={i} className="flex items-start p-3 bg-white dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700/50 hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer transition-colors">
                                                            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" onChange={(e) => handleBulletSelection(bullet, e.target.checked)}/>
                                                            <span className="ml-3 text-sm text-slate-700 dark:text-slate-300">{bullet}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <button onClick={handleClearWorkshop} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2">Add another duty</button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-semibold text-sm text-red-600 dark:text-red-400">Not a qualifying IT duty.</p>
                                                <p className="text-sm"><span className="font-medium">Reasoning:</span> {activeWorkshopState.analysisResult.reasoning}</p>
                                                <p className="text-sm"><span className="font-medium">Try This Instead:</span> {activeWorkshopState.analysisResult.itEquivalent}</p>
                                                 <button onClick={handleClearWorkshop} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2">Try again</button>
                                            </div>
                                        )}
                                    </div>
                                    )}
                                    <div className="pt-4 mt-4 border-t border-dashed border-slate-300 dark:border-slate-600">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Current Responsibilities</h4>
                                            {exp.responsibilities.length > 0 ? (
                                                <div className="space-y-2">
                                                    {exp.responsibilities.map((resp, idx) => (
                                                        <div key={idx} className="flex items-start justify-between p-2 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-200 dark:border-slate-700">
                                                            <span className="text-xs text-slate-600 dark:text-slate-400">{resp}</span>
                                                            <button onClick={() => removeResponsibility(exp.id, resp)} className="ml-2 text-slate-400 hover:text-red-500">
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 italic">No responsibilities added yet.</p>
                                            )}
                                        </div>

                                        <h4 className="text-md font-semibold mb-2 flex items-center">
                                            <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-400" />
                                            Duty Suggestions for &quot;{exp.jobTitle}&quot;
                                        </h4>
                                        {activeWorkshopState?.suggestionsError ? (
                                            <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/50 rounded-md">
                                                <p>{activeWorkshopState.suggestionsError}</p>
                                                <button onClick={() => fetchSuggestedDuties(exp.id)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-semibold">
                                                    Retry
                                                </button>
                                            </div>
                                        ) : activeWorkshopState?.isGeneratingDuties ? (
                                            <div className="flex items-center text-sm text-slate-500">
                                                <SettingsIcon className="animate-spin h-5 w-5 mr-2" />
                                                Generating tailored suggestions...
                                            </div>
                                        ) : activeWorkshopState?.suggestedDuties && activeWorkshopState.suggestedDuties.length > 0 ? (
                                            <div className="space-y-3">
                                                {activeWorkshopState.suggestedDuties.map((suggestion, index) => (
                                                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                                                        <div className="flex justify-between items-start">
                                                            <button 
                                                                onClick={() => setActiveWorkshopState({ currentDuty: suggestion.duty })}
                                                                className="text-left text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:hover:text-indigo-400"
                                                            >
                                                                {suggestion.duty}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleAddSuggestedDuty(exp.id, suggestion.duty)}
                                                                className="ml-2 flex-shrink-0 p-1.5 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-800"
                                                                aria-label="Add duty to resume"
                                                            >
                                                                <PlusIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 italic">
                                                            <span className="font-semibold">Relevance:</span> {suggestion.relevance}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500">No suggestions available for this job.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                 </div>
            </div>

            {/* 6. Education */}
            <EducationForm education={resumeData.education} onEducationChange={handleEducationChange} />

            {/* Global Context (Moved to Bottom or Integrated) */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                 <h3 className="text-lg font-semibold mb-4">Global Context</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className={labelClass}>Program</label>
                        <input type="text" value={program} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-800 cursor-not-allowed`} />
                     </div>
                     <div>
                         <label className={labelClass}>Experience Level</label>
                         <input type="text" value={experienceLevel} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-800 cursor-not-allowed`} />
                     </div>
                     <div className="sm:col-span-2">
                        <label className={labelClass}>Selected Certifications</label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {selectedCerts.map(cert => ( <span key={cert} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">{cert}</span> ))}
                        </div>
                     </div>
                 </div>
                 <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-2">Target Job Description (Optional)</h3>
                    <textarea rows={6} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className={inputClass} placeholder="Paste a job description here to tailor your summary."/>
                    
                    <button 
                      onClick={handleAnalyzeAlignment} 
                      disabled={isAnalyzingAlignment || !jobDescription.trim()}
                      className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-semibold transition-colors"
                    >
                      {isAnalyzingAlignment ? <SettingsIcon className="animate-spin h-5 w-5 mr-2" /> : <SparklesIcon className="h-5 w-5 mr-2" />}
                      Analyze Resume Alignment
                    </button>

                    {alignmentError && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{alignmentError}</p>
                    )}

                    {alignmentAnalysis && (
                      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 dark:text-white">Alignment Score</h4>
                          <div className="flex items-center">
                            <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mr-2">
                              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${alignmentAnalysis.score}%` }}></div>
                            </div>
                            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{alignmentAnalysis.score}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Matching Keywords</h5>
                            <div className="flex flex-wrap gap-1">
                              {alignmentAnalysis.matchingKeywords.map((kw, i) => (
                                <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] rounded-full">{kw}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Missing Keywords</h5>
                            <div className="flex flex-wrap gap-1">
                              {alignmentAnalysis.missingKeywords.map((kw, i) => (
                                <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px] rounded-full">{kw}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Strengths</h5>
                          <ul className="list-disc ml-4 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                            {alignmentAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>

                        <div>
                          <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Weaknesses / Gaps</h5>
                          <ul className="list-disc ml-4 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                            {alignmentAnalysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Actionable Suggestions</h5>
                          <ul className="list-disc ml-4 text-sm text-indigo-700 dark:text-indigo-300 space-y-1 font-medium">
                            {alignmentAnalysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                 </div>
            </div>
        </div>
        <div className="mt-8 lg:mt-0 relative">
            <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
                <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white print:hidden">Live Preview</h2>
                <ResumePreview resumeData={resumeData} selectedCerts={selectedCerts} />
            </div>
        </div>
      </main>
      
      {isRubricModalOpen && (
          <RubricModal 
              onClose={() => setIsRubricModalOpen(false)}
              onComplete={handleRubricComplete}
          />
      )}

      {isExportModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden" aria-modal="true" role="dialog" onClick={() => setIsExportModalOpen(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Export Resume</h3>
                    <button onClick={() => setIsExportModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close modal"> <XMarkIcon className="h-6 w-6" /> </button>
                </div>
                <div className="p-6 space-y-4">
                    <button onClick={handleDownloadDocx} disabled={isDownloading} className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold">
                        {isDownloading ? <BinaryIcon className="animate-spin h-5 w-5 mr-2" /> : <DocumentArrowDownIcon className="h-5 w-5 mr-2" />}
                        Download as .docx
                    </button>
                    <button onClick={handleCopyText} className="w-full flex items-center justify-center px-4 py-3 bg-slate-600 text-white rounded-md hover:bg-slate-700 font-semibold">
                        <ClipboardIcon className="h-5 w-5 mr-2" />
                        {copyStatus === 'copied' ? 'Copied to Clipboard!' : 'Copy as Text'}
                    </button>
                     <button onClick={() => window.print()} className="w-full flex items-center justify-center px-4 py-3 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white rounded-md hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold">
                        <PrinterIcon className="h-5 w-5 mr-2" />
                        Print / Save as PDF
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
