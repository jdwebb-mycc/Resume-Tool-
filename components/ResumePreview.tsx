

import React from 'react';
import PropTypes from 'prop-types';
import { ResumeData } from '../types';
import { EnvelopeIcon, PhoneIcon, LinkIcon, GlobeAltIcon } from './Icons';

interface ResumePreviewProps {
  resumeData: ResumeData;
  selectedCerts?: string[];
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Handle YYYY-MM-DD format from input type="date" without timezone shifts
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    try {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
}

const ResumePreviewInner: React.FC<ResumePreviewProps> = ({ resumeData, selectedCerts = [] }) => {
  const { personalDetails, summary, experience, education, skills, projects } = resumeData;

  const formattedSkills = skills.split(/, |,|\/|\||\s-\s/).map(s => s.trim()).filter(s => s).slice(0, 20).join(' | ');

  const sectionTitleClass = "text-lg font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2 uppercase tracking-tight";
  const sectionSpacingClass = "mb-2"; // Consistent 8px spacing

  return (
    <div id="resume-preview" className="bg-white shadow-lg rounded-lg p-8 lg:p-12 text-[11pt] text-gray-800 print:shadow-none print:p-0 leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <header className="text-center border-b-2 border-gray-300 pb-2 mb-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-normal uppercase">{personalDetails.fullName}</h1>
        <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-[9pt] text-gray-600">
          <a href={`mailto:${personalDetails.email}`} className="flex items-center hover:text-indigo-600"><EnvelopeIcon className="h-3 w-3 mr-1"/>{personalDetails.email}</a>
          <span className="flex items-center"><PhoneIcon className="h-3 w-3 mr-1"/>{personalDetails.phoneNumber}</span>
          <a href={`https://${personalDetails.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center hover:text-indigo-600"><LinkIcon className="h-3 w-3 mr-1"/>{personalDetails.linkedin}</a>
          {personalDetails.website && <a href={`https://${personalDetails.website}`} target="_blank" rel="noreferrer" className="flex items-center hover:text-indigo-600"><GlobeAltIcon className="h-3 w-3 mr-1"/>{personalDetails.website}</a>}
        </div>
      </header>

      {/* Summary Section */}
      <section className={sectionSpacingClass}>
        <h2 className={sectionTitleClass}>Professional Summary</h2>
        <p className="text-gray-700 leading-normal text-justify">{summary}</p>
      </section>

      {/* Skills Section */}
      <section className={sectionSpacingClass}>
        <h2 className={sectionTitleClass}>Technical Skills</h2>
        <p className="text-gray-700 leading-normal">{formattedSkills}</p>
      </section>

      {/* Experience Section */}
      <section className={sectionSpacingClass}>
        <h2 className={sectionTitleClass}>Professional Experience</h2>
        <div className="space-y-2">
          {experience.map(exp => (
            <div key={exp.id}>
              <div className="flex justify-between items-baseline">
                <h3 className="text-[11pt] font-bold text-gray-900">{exp.jobTitle}</h3>
                <p className="text-[9pt] text-gray-700 font-normal">{formatDate(exp.startDate)} - {exp.endDate === 'Present' ? 'Present' : formatDate(exp.endDate)}</p>
              </div>
              <p className="text-[10pt] font-normal text-gray-800">{exp.company}</p>
              <ul className="mt-1 list-disc ml-5 text-gray-700 space-y-0.5">
                {exp.responsibilities.filter(line => line.trim() !== '').map((line, i) => (
                  <li key={i} className="leading-tight">{line.replace(/^- /, '')}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Projects Section */}
      {projects && projects.length > 0 && (
        <section className={sectionSpacingClass}>
          <h2 className={sectionTitleClass}>Key Projects</h2>
          <div className="space-y-2">
            {projects.map(proj => (
              <div key={proj.id}>
                <h3 className="text-[11pt] font-bold text-gray-900">{proj.title}</h3>
                <ul className="mt-1 list-disc ml-5 text-gray-700 space-y-0.5">
                  {proj.description.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                    <li key={i} className="leading-tight">{line.replace(/^- /, '')}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education Section */}
      <section className={sectionSpacingClass}>
        <h2 className={sectionTitleClass}>Education & Certifications</h2>
         <div className="space-y-2">
          {education.map(edu => (
            <div key={edu.id}>
              <div className="flex justify-between items-baseline">
                <h3 className="text-[11pt] font-bold text-gray-900">{edu.degree}</h3>
                 <p className="text-[9pt] text-gray-700 font-normal">{formatDate(edu.startDate)} - {formatDate(edu.endDate)}</p>
              </div>
              <p className="text-[10pt] font-normal text-gray-800">{edu.school}</p>
            </div>
          ))}
          
          {/* Certifications */}
          {selectedCerts.length > 0 && (
            <div className="mt-2">
              <h3 className="text-[11pt] font-bold text-gray-900 mb-1">Professional Certifications</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {selectedCerts.map((cert, i) => (
                  <div key={i} className="text-[10pt] text-gray-700">• {cert}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #resume-preview {
            color: #000 !important;
            background-color: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #resume-preview h1, #resume-preview h2, #resume-preview h3 {
             color: #000 !important;
          }
           #resume-preview p, #resume-preview div, #resume-preview li, #resume-preview a, #resume-preview span {
             color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
};

const ResumePreview = React.memo(ResumePreviewInner);
ResumePreview.displayName = 'ResumePreview';

ResumePreview.propTypes = {
  resumeData: PropTypes.shape({
    personalDetails: PropTypes.shape({
      fullName: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      phoneNumber: PropTypes.string.isRequired,
      linkedin: PropTypes.string,
      website: PropTypes.string,
    }).isRequired,
    summary: PropTypes.string.isRequired,
    experience: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      jobTitle: PropTypes.string.isRequired,
      company: PropTypes.string.isRequired,
      startDate: PropTypes.string.isRequired,
      endDate: PropTypes.string.isRequired,
      responsibilities: PropTypes.arrayOf(PropTypes.string).isRequired,
    })).isRequired,
    education: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      school: PropTypes.string.isRequired,
      degree: PropTypes.string.isRequired,
      startDate: PropTypes.string.isRequired,
      endDate: PropTypes.string.isRequired,
    })).isRequired,
    skills: PropTypes.string.isRequired,
    projects: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    })),
  }).isRequired,
};

export default ResumePreview;
