
import React, { useState } from 'react';
import { programCerts } from '../constants';
import { ResumeData } from '../types';
import { parseResumeText } from '../services/geminiService';
import { BinaryIcon } from './Icons';
import mammoth from 'mammoth';

interface SetupScreenProps {
    onComplete: (program: string, certs: string[], parsedData: ResumeData, jobDescription: string, experienceLevel: string) => void;
}
const experienceLevels = [
    'No Computer Experience (Never performed IT duties on the job)',
    'Home User Experience (Used computer for personal use and training only. No/minimal IT experience)',
    'Entry Level Experience (3 months - 3 years of Technical/IT Experience)',
    'Advanced Level Experience (4+ years of advanced technology-focused position)',
];

type InputType = 'upload' | 'paste';

const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
    const [inputType, setInputType] = useState<InputType>('upload');
    const [program, setProgram] = useState('');
    const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
    const [noCertsAcquired, setNoCertsAcquired] = useState(false);
    const [experienceLevel, setExperienceLevel] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [pastedText, setPastedText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCertChange = (cert: string) => {
        setNoCertsAcquired(false);
        setSelectedCerts(prev => 
            prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
        );
    };

    const handleNoCertsChange = () => {
        const isNowChecked = !noCertsAcquired;
        setNoCertsAcquired(isNowChecked);
        if (isNowChecked) {
            setSelectedCerts([]);
        }
    };

    const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setProgram(e.target.value);
        setSelectedCerts([]);
        setNoCertsAcquired(false);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setResumeFile(e.target.files[0]);
            setError(null);
        }
    };

    const getResumeText = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (inputType === 'paste') {
                if (!pastedText.trim()) return reject(new Error("Pasted resume text cannot be empty."));
                return resolve(pastedText);
            }
    
            if (inputType === 'upload' && resumeFile) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const arrayBuffer = event.target?.result;
                    if (arrayBuffer) {
                        try {
                            const { value } = await mammoth.extractRawText({ arrayBuffer: arrayBuffer as ArrayBuffer });
                            resolve(value);
                        } catch (mammothError) {
                                console.error("Mammoth error:", mammothError);
                            reject(new Error("Failed to parse the .docx file."));
                        }
                    } else {
                        reject(new Error("Could not read the file buffer."));
                    }
                };
                reader.onerror = () => reject(new Error("Failed to read the resume file."));
                reader.readAsArrayBuffer(resumeFile);
            } else {
                reject(new Error("Please upload a resume file (.docx)."));
            }
        });
    }
    const handleSubmit = async () => {
    setIsParsing(true);
    setError(null);

    try {
        const text = await getResumeText();
        const parsedData = await parseResumeText(text);
        onComplete(program, selectedCerts, parsedData, jobDescription, experienceLevel);
    } catch (e: unknown) {
        console.error(e);
        const message =
            e instanceof Error ? e.message : "An unexpected error occurred.";
        setError(message);
        setIsParsing(false);
    }
};
    
    const isReady = program && (selectedCerts.length > 0 || noCertsAcquired) && experienceLevel && (resumeFile || pastedText.trim());
    const inputClass = "block w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
    const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1";


    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-center text-slate-900 dark:text-white">Welcome!</h1>
                    <p className="text-center text-slate-600 dark:text-slate-400 mt-2">Let&apos;s start by setting up your context.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>1. Select Your Program</label>
                        <select value={program} onChange={handleProgramChange} className={inputClass}>
                            <option value="" disabled>Choose a program...</option>
                            <option value="ITSA">ITSA (IT Support Associate)</option>
                            <option value="CWP">CWP (Cybersecurity Workforce Program)</option>
                        </select>
                    </div>

                    {program && (
                        <div>
                            <label className={labelClass}>2. Certifications Status</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Select all certifications you hold, or choose the option below if you have none yet.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {programCerts[program]?.map(cert => (
                                    <label key={cert} className="flex items-center p-3 w-full bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600/50 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-colors">
                                        <input type="checkbox" checked={selectedCerts.includes(cert)} onChange={() => handleCertChange(cert)} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                        <span className="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">{cert}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <label className="flex items-center p-3 w-full bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600/50 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-colors">
                                    <input type="checkbox" checked={noCertsAcquired} onChange={handleNoCertsChange} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                    <span className="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">No certifications acquired yet</span>
                                </label>
                            </div>
                        </div>
                    )}
                    
                    <div>
                         <label className={labelClass}>3. Select Your Experience Level</label>
                         <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className={inputClass}>
                            <option value="" disabled>Select experience level...</option>
                            {experienceLevels.map(level => (<option key={level} value={level}>{level}</option>))}
                        </select>
                     </div>

                    <div>
                        <label className={labelClass}>4. Provide Your Resume</label>
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <button onClick={() => setInputType('upload')} className={`px-4 py-2 text-sm font-medium ${inputType === 'upload' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Upload .docx</button>
                            <button onClick={() => setInputType('paste')} className={`px-4 py-2 text-sm font-medium ${inputType === 'paste' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Paste Text</button>
                        </div>
                        <div className="pt-4">
                            {inputType === 'upload' ? (
                                <div>
                                <input
                                    type="file"
                                    accept=".docx"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {resumeFile && <p className="text-xs text-slate-500 mt-1">Selected: {resumeFile.name}</p>}
                            </div>
                        ) : (
                            <textarea
                            rows={8}
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            className={inputClass}
                            placeholder="Paste the full text of your resume here..."
                            />
                            )}
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>5. Paste Target Job Description (Optional)</label>
                         <textarea rows={4} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className={inputClass} placeholder="Paste the full job description here..."/>
                    </div>
                </div>
                
                {error && <p className="text-sm text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-2 rounded-md">{error}</p>}
                
                <button onClick={handleSubmit} disabled={!isReady || isParsing} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center">
                    {isParsing ? <><BinaryIcon className="animate-spin h-5 w-5 mr-2" /> Parsing Resume...</> : 'Start Workshop'}
                </button>
        </div>
      </div>
    );
};

export default SetupScreen;
    