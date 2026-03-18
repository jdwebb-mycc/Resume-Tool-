import React, { useState, useEffect } from 'react';
import { SparklesIcon, BinaryIcon } from './Icons';

interface SkillsEditorProps {
  skills: string;
  onSkillsChange: (skills: string) => void;
  suggestedSkills: string[];
  onGenerateSkills: () => void;
  isGeneratingSkills: boolean;
}

const SkillsEditorInner: React.FC<SkillsEditorProps> = ({ 
  skills, 
  onSkillsChange, 
  suggestedSkills, 
  onGenerateSkills, 
  isGeneratingSkills 
}) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    // Initialize selected skills from skills prop
    const skillsArray = skills ? skills.split(' | ').filter(s => s) : [];
    setSelectedSkills(skillsArray);
  }, [skills]);

  const handleSkillToggle = (skill: string) => {
    let newSelectedSkills;
    if (selectedSkills.includes(skill)) {
      newSelectedSkills = selectedSkills.filter(s => s !== skill);
    } else {
      if (selectedSkills.length < 20) {
        newSelectedSkills = [...selectedSkills, skill];
      } else {
        return;
      }
    }
    setSelectedSkills(newSelectedSkills);
    onSkillsChange(newSelectedSkills.join(' | '));
  };

  const allSkills = [...new Set([...suggestedSkills, ...selectedSkills])];

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Skills</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selectedSkills.length >= 20 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
            {selectedSkills.length}/20
          </span>
        </div>
        <button 
          onClick={onGenerateSkills} 
          className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold disabled:opacity-50"
          disabled={isGeneratingSkills}
        >
          {isGeneratingSkills ? <BinaryIcon className="animate-spin h-4 w-4 mr-1" /> : <SparklesIcon className="h-4 w-4 mr-1" />}
          Generate Suggestions
        </button>
      </div>
      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          {selectedSkills.length >= 20 
            ? "Maximum skills reached (20). Deselect a skill to add a new one." 
            : "Select up to 20 skills. Click to add or remove."}
        </p>
        <div className="flex flex-wrap gap-2">
          {allSkills.map(skill => {
            const isSelected = selectedSkills.includes(skill);
            const isLimitReached = selectedSkills.length >= 20;
            return (
              <button
                key={skill}
                onClick={() => handleSkillToggle(skill)}
                disabled={!isSelected && isLimitReached}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${isSelected 
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isLimitReached 
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 border border-slate-300 dark:border-slate-600'}`}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SkillsEditor = React.memo(SkillsEditorInner);
SkillsEditor.displayName = 'SkillsEditor';

export default SkillsEditor;
