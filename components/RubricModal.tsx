
import React, { useState, useMemo } from 'react';
import { XMarkIcon, CheckCircleIcon } from './Icons';

interface RubricModalProps {
    onClose: () => void;
    onComplete: () => void;
}

const rubricItems = [
    { id: 'contact', text: 'Contact Information is accurate and professional.' },
    { id: 'spelling', text: 'There are no spelling or grammatical errors.' },
    { id: 'titles', text: 'Job titles and company names are correct.' },
    { id: 'dates', text: 'Employment and education dates are accurate.' },
    { id: 'clarity', text: 'Summary and bullet points are clear, concise, and results-oriented.' },
    { id: 'formatting', text: 'The resume formatting is clean and consistent.' }
];

const RubricModal: React.FC<RubricModalProps> = ({ onClose, onComplete }) => {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    const handleCheckboxChange = (id: string) => {
        setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const allItemsChecked = useMemo(() => {
        return rubricItems.every(item => !!checkedItems[item.id]);
    }, [checkedItems]);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden" aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                        <CheckCircleIcon className="h-6 w-6 mr-2 text-indigo-500" />
                        Final Review Rubric
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close modal">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        As the Career Services Advisor/Associate, please confirm you have reviewed the resume and that it meets the following quality standards.
                    </p>
                    <div className="space-y-3">
                        {rubricItems.map(item => (
                            <label key={item.id} className="flex items-center p-3 w-full bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!checkedItems[item.id]}
                                    onChange={() => handleCheckboxChange(item.id)}
                                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">{item.text}</span>
                            </label>
                        ))}
                    </div>
                    {allItemsChecked && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-md mt-4">
                            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                                By proceeding, I acknowledge that I have reviewed this resume according to the rubric above and confirm it is ready for the student.
                            </p>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white rounded-md hover:bg-slate-300 dark:hover:bg-slate-700">
                        Cancel
                    </button>
                    <button 
                        onClick={onComplete}
                        disabled={!allItemsChecked} 
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Proceed to Export
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RubricModal;