
import React from 'react';
import { ResumeData } from '../types';
import { PlusIcon, TrashIcon } from './Icons';

interface PersonalDetailsFormProps {
  personalDetails: ResumeData['personalDetails'];
  onDetailsChange: (details: ResumeData['personalDetails']) => void;
}

const PersonalDetailsFormInner: React.FC<PersonalDetailsFormProps> = ({ personalDetails, onDetailsChange }) => {
  const handlePersonalDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onDetailsChange({ ...personalDetails, [name]: value });
  };

  const inputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Personal Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input type="text" name="fullName" value={personalDetails.fullName} onChange={handlePersonalDetailsChange} className={inputClass} placeholder="Jane Doe"/>
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" name="email" value={personalDetails.email} onChange={handlePersonalDetailsChange} className={inputClass} placeholder="jane.doe@email.com"/>
        </div>
        <div>
          <label className={labelClass}>Phone Number</label>
          <input type="tel" name="phoneNumber" value={personalDetails.phoneNumber} onChange={handlePersonalDetailsChange} className={inputClass} placeholder="(555) 123-4567"/>
        </div>
        <div>
          <label className={labelClass}>LinkedIn Profile URL</label>
          <input type="text" name="linkedin" value={personalDetails.linkedin} onChange={handlePersonalDetailsChange} className={inputClass} placeholder="linkedin.com/in/janedoe"/>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Personal Website/Portfolio</label>
          <input type="text" name="website" value={personalDetails.website} onChange={handlePersonalDetailsChange} className={inputClass} placeholder="github.com/janedoe"/>
        </div>
      </div>
    </div>
  );
};

export const PersonalDetailsForm = React.memo(PersonalDetailsFormInner);
PersonalDetailsForm.displayName = 'PersonalDetailsForm';

interface EducationFormProps {
  education: ResumeData['education'];
  onEducationChange: (education: ResumeData['education']) => void;
}

const EducationFormInner: React.FC<EducationFormProps> = ({ education, onEducationChange }) => {
  const handleEducationChange = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onEducationChange(education.map(edu => edu.id === id ? { ...edu, [name]: value } : edu));
  };

  const addEducation = () => {
    onEducationChange([...education, { id: Date.now(), degree: '', school: '', startDate: '', endDate: '' }]);
  };

  const removeEducation = (id: number) => {
    onEducationChange(education.filter(edu => edu.id !== id));
  };

  const inputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Education</h3>
          <button onClick={addEducation} className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
              <PlusIcon className="h-4 w-4 mr-1" /> Add Education
          </button>
      </div>
      <div className="space-y-4">
        {education.map(edu => (
          <div key={edu.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-md relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label className={labelClass}>Degree/Certificate</label>
                      <input type="text" name="degree" value={edu.degree} onChange={e => handleEducationChange(edu.id, e)} className={inputClass} />
                  </div>
                  <div>
                      <label className={labelClass}>School/Institution</label>
                      <input type="text" name="school" value={edu.school} onChange={e => handleEducationChange(edu.id, e)} className={inputClass} />
                  </div>
                  <div>
                      <label className={labelClass}>Start Date</label>
                      <input type="date" name="startDate" value={edu.startDate} onChange={e => handleEducationChange(edu.id, e)} className={inputClass} />
                  </div>
                   <div>
                      <label className={labelClass}>End Date</label>
                      <input type="date" name="endDate" value={edu.endDate} onChange={e => handleEducationChange(edu.id, e)} className={inputClass} />
                  </div>
              </div>
               <button onClick={() => removeEducation(edu.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500">
                  <TrashIcon className="h-5 w-5" />
              </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EducationForm = React.memo(EducationFormInner);
EducationForm.displayName = 'EducationForm';


export {};
