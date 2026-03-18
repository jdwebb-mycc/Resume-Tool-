
import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { BinaryIcon, SparklesIcon, GlobeAltIcon } from './Icons';

interface ProjectGeneratorProps {
    programCerts: string[];
    experienceLevel: string;
    onGenerate: (cert: string, level: string) => void;
    projects: Project[];
    isLoading: boolean;
    onAddProject: (project: Project) => void;
    onRemoveProject: (title: string) => void;
    selectedProjectTitles: string[];
}

const experienceLevels = ['Beginner', 'Intermediate', 'Advanced'];
const levelMap: Record<string, string> = {
    'No Computer Experience (Never performed IT duties on the job)': 'Beginner',
    'Home User Experience (Used computer for personal use and training only. No/minimal IT experience)': 'Beginner',
    'Entry Level Experience (3 months - 3 years of Technical/IT Experience)': 'Intermediate',
    'Advanced Level Experience (4+ years of advanced technology-focused position)': 'Advanced',
};


const ProjectGeneratorInner: React.FC<ProjectGeneratorProps> = ({ 
    programCerts, 
    experienceLevel, 
    onGenerate, 
    projects, 
    isLoading,
    onAddProject,
    onRemoveProject,
    selectedProjectTitles
}) => {
    const [selectedCert, setSelectedCert] = useState(programCerts[0] || '');
    const [selectedLevel, setSelectedLevel] = useState(levelMap[experienceLevel] || 'Beginner');

    useEffect(() => {
        // Update selection if the global context changes after initial render
        setSelectedCert(programCerts[0] || '');
        setSelectedLevel(levelMap[experienceLevel] || 'Beginner');
    }, [programCerts, experienceLevel]);

    const handleSubmit = () => {
        if (selectedCert && selectedLevel) {
            onGenerate(selectedCert, selectedLevel);
        }
    };

    const inputClass = "block w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
    const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-900 dark:text-white">
                <GlobeAltIcon className="h-6 w-6 mr-2 text-indigo-400" /> Project Generator
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Generate realistic projects to add to your resume based on a certification and experience level. Drag the final bullet point onto a job to add it.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className={labelClass}>Certification</label>
                    <select value={selectedCert} onChange={(e) => setSelectedCert(e.target.value)} className={inputClass} disabled={programCerts.length === 0}>
                        {programCerts.length > 0 ? (
                            programCerts.map(cert => <option key={cert} value={cert}>{cert}</option>)
                        ) : (
                            <option>No certs for this program</option>
                        )}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Experience Level</label>
                    <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={inputClass}>
                        {experienceLevels.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                <div className="flex items-end">
                    <button onClick={handleSubmit} disabled={isLoading || !selectedCert} className="w-full h-fit px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center font-semibold">
                        {isLoading ? <BinaryIcon className="animate-spin h-5 w-5 mr-2" /> : <SparklesIcon className="h-5 w-5 mr-2" />}
                        Generate
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center h-48">
                    <BinaryIcon className="animate-spin h-8 w-8 text-indigo-500" />
                </div>
            )}

            {projects.length > 0 && (
                <div className="mt-6 space-y-4">
                    {projects.slice(0, 3).map((project, index) => {
                        const isSelected = selectedProjectTitles.includes(project.title);
                        return (
                            <div key={index} className={`border p-4 rounded-lg transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-md text-slate-900 dark:text-white">{project.title}</h4>
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    onAddProject(project);
                                                } else {
                                                    onRemoveProject(project.title);
                                                }
                                            }}
                                            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="ml-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            {isSelected ? 'Added' : 'Add to Resume'}
                                        </span>
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1"><span className="font-semibold">Objective:</span> {project.objective}</p>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                    <p><span className="font-semibold text-slate-600 dark:text-slate-300">Tools/Tech:</span> {project.tools}</p>
                                    <p><span className="font-semibold text-slate-600 dark:text-slate-300">Skills:</span> {project.skills}</p>
                                    <p><span className="font-semibold text-slate-600 dark:text-slate-300">Deliverables:</span> {project.deliverables}</p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 italic">Resume Bullet Point:</p>
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-md text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {project.resumeBullet}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ProjectGenerator = React.memo(ProjectGeneratorInner);
ProjectGenerator.displayName = 'ProjectGenerator';

export default ProjectGenerator;
