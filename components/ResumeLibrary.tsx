import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { XMarkIcon, MagnifyingGlassIcon, CalendarIcon, UserIcon, BriefcaseIcon } from './Icons';
import { ResumeData } from '../types';

interface FinalizedResume {
  id: string;
  fullName: string;
  editorName: string;
  finalizedAt: Timestamp | Date;
  jobDescriptionUrl: string;
  jobDescriptionText: string;
  resumeName: string;
  version: number;
  resumeData: ResumeData;
  uid: string;
}

interface ResumeLibraryProps {
  onClose: () => void;
  onSelectResume: (data: ResumeData) => void;
}

const ResumeLibraryInner: React.FC<ResumeLibraryProps> = ({ onClose, onSelectResume }) => {
  const [resumes, setResumes] = useState<FinalizedResume[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'finalizedResumes'), 
      orderBy('finalizedAt', 'desc'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FinalizedResume[];
      setResumes(docs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching resumes:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredResumes = resumes.filter(resume => {
    const searchLower = searchTerm.toLowerCase();
    return (
      resume.fullName.toLowerCase().includes(searchLower) ||
      resume.resumeName.toLowerCase().includes(searchLower) ||
      resume.editorName.toLowerCase().includes(searchLower) ||
      (resume.jobDescriptionText && resume.jobDescriptionText.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (timestamp: Timestamp | Date) => {
    if (!timestamp) return 'N/A';
    const date = (timestamp as Timestamp).toDate ? (timestamp as Timestamp).toDate() : (timestamp as Date);
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Resume Library</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Search through finalized resumes and job descriptions</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XMarkIcon className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, version, editor, or job description keywords..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-slate-500">Loading library...</p>
            </div>
          ) : filteredResumes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResumes.map((resume) => (
                <div 
                  key={resume.id} 
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => {
                    if (confirm(`Do you want to load the resume for ${resume.fullName}? This will overwrite your current work.`)) {
                      onSelectResume(resume.resumeData);
                      onClose();
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {resume.resumeName}
                    </h4>
                    <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded">
                      v{resume.version}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-slate-400" />
                      <span>Person: <span className="font-medium text-slate-900 dark:text-slate-200">{resume.fullName}</span></span>
                    </div>
                    <div className="flex items-center">
                      <BriefcaseIcon className="h-4 w-4 mr-2 text-slate-400" />
                      <span>Editor: <span className="font-medium text-slate-900 dark:text-slate-200">{resume.editorName}</span></span>
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2 text-slate-400" />
                      <span>Finalized: {formatDate(resume.finalizedAt)}</span>
                    </div>
                  </div>

                  {resume.jobDescriptionUrl && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <a 
                        href={resume.jobDescriptionUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Job Description Link
                      </a>
                    </div>
                  )}
                  
                  {resume.jobDescriptionText && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 line-clamp-2 italic">
                        &quot;{resume.jobDescriptionText}&quot;
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <MagnifyingGlassIcon className="h-12 w-12 mb-4 opacity-20" />
              <p>No resumes found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ResumeLibrary = React.memo(ResumeLibraryInner);
ResumeLibrary.displayName = 'ResumeLibrary';

export default ResumeLibrary;
