
import * as docx from 'docx';
import { ResumeData } from '../types';

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.toLowerCase() === 'present') return 'Present';
    try {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
};

const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
};

const Section = (title: string, children: docx.Paragraph[]) => {
    return [
        new docx.Paragraph({
            heading: docx.HeadingLevel.HEADING_2,
            children: [new docx.TextRun({ text: title })],
            border: { bottom: { color: "auto", space: 1, style: "single", size: 6 } },
            spacing: { after: 200 }
        }),
        ...children
    ];
};

export const generateDocxBlob = async (resumeData: ResumeData): Promise<Blob> => {
    const { personalDetails, summary, experience, education, skills } = resumeData;

    const doc = new docx.Document({
        styles: {
            paragraphStyles: [
                { id: "normal", name: "Normal", run: { font: "Arial", size: 22 } },
                { id: "heading1", name: "Heading 1", basedOn: "normal", run: { size: 52, bold: true }, spacing: { after: 240 } },
                { id: "heading2", name: "Heading 2", basedOn: "normal", run: { size: 28, bold: true }, spacing: { before: 240, after: 120 } }
            ]
        },
        sections: [{
            children: [
                new docx.Paragraph({
                    alignment: docx.AlignmentType.CENTER,
                    children: [new docx.TextRun({ text: personalDetails.fullName, bold: true, size: 48 })],
                }),
                new docx.Paragraph({
                    alignment: docx.AlignmentType.CENTER,
                    children: [
                        new docx.TextRun({ text: `${personalDetails.email} | ${personalDetails.phoneNumber}` }),
                        new docx.TextRun({ text: ` | ` }),
                        new docx.ExternalHyperlink({
                            children: [new docx.TextRun({ text: personalDetails.linkedin, style: "Hyperlink" })],
                            link: ensureHttps(personalDetails.linkedin),
                        }),
                        ...(personalDetails.website ? [
                             new docx.TextRun({ text: ` | ` }),
                             new docx.ExternalHyperlink({
                                children: [new docx.TextRun({ text: personalDetails.website, style: "Hyperlink" })],
                                link: ensureHttps(personalDetails.website),
                            }),
                        ] : [])
                    ],
                    spacing: { after: 200 }
                }),
                
                ...Section("Summary", [new docx.Paragraph({ text: summary })]),

                ...Section("Skills", [new docx.Paragraph({ text: skills })]),

                ...(resumeData.projects && resumeData.projects.length > 0 ? Section("Projects", resumeData.projects.flatMap(proj => [
                    new docx.Paragraph({
                        children: [new docx.TextRun({ text: proj.title, bold: true })],
                        spacing: { before: 120 }
                    }),
                    ...proj.description.split('\n').filter(line => line.trim()).map(line => new docx.Paragraph({
                        text: line.replace(/^- /, ''),
                        bullet: { level: 0 }
                    }))
                ])) : []),

                ...Section("Experience", experience.flatMap(exp => [
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({ text: exp.jobTitle, bold: true }),
                            new docx.TextRun({
                                text: `\t${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}`,
                            })
                        ],
                        tabStops: [{ type: 'right', position: docx.convertInchesToTwip(6.5) }]
                    }),
                    new docx.Paragraph({
                        children: [new docx.TextRun({ text: exp.company, italics: true })],
                        spacing: { after: 100 }
                    }),
                    ...exp.responsibilities.filter(r => r.trim()).map(resp => new docx.Paragraph({
                        text: resp.replace(/^- /, ''),
                        bullet: { level: 0 }
                    }))
                ])),

                ...Section("Education", education.flatMap(edu => [
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({ text: edu.degree, bold: true }),
                            new docx.Tab(),
                            new docx.TextRun({
                                text: `${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}`,
                            })
                        ],
                        tabStops: [{ type: 'right', position: docx.convertInchesToTwip(6.5) }]
                    }),
                    new docx.Paragraph({
                        children: [new docx.TextRun({ text: edu.school, italics: true })],
                        spacing: { after: 100 }
                    }),
                ])),
            ]
        }]
    });

    return docx.Packer.toBlob(doc);
};


export const formatResumeAsText = (resumeData: ResumeData): string => {
    const { personalDetails, summary, experience, education, skills, projects } = resumeData;

    const header = `${personalDetails.fullName}\n${personalDetails.email} | ${personalDetails.phoneNumber} | ${personalDetails.linkedin}${personalDetails.website ? ` | ${personalDetails.website}` : ''}`;

    const summarySection = `SUMMARY\n--------------------\n${summary}`;
    
    const skillsSection = `SKILLS\n--------------------\n${skills}`;

    const projectsSection = projects && projects.length > 0 ? `PROJECTS\n--------------------\n${projects.map(proj => 
        `${proj.title}\n${proj.description.split('\n').map(line => `  - ${line.replace(/^- /, '')}`).join('\n')}`
    ).join('\n\n')}` : '';

    const experienceSection = `EXPERIENCE\n--------------------\n${experience.map(exp => 
        `${exp.jobTitle}, ${exp.company} (${formatDate(exp.startDate)} - ${formatDate(exp.endDate)})\n${exp.responsibilities.map(r => `  - ${r}`).join('\n')}`
    ).join('\n\n')}`;
    
    const educationSection = `EDUCATION\n--------------------\n${education.map(edu => 
        `${edu.degree}, ${edu.school} (${formatDate(edu.startDate)} - ${formatDate(edu.endDate)})`
    ).join('\n')}`;

    return [header, summarySection, skillsSection, projectsSection, experienceSection, educationSection].filter(s => s).join('\n\n');
};

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};