
import { Type } from '@google/genai';

export interface PersonalDetails {
  fullName: string;
  email: string;
  phoneNumber: string;
  linkedin: string;
  website: string;
}

export interface WorkExperience {
  id: number;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: 'Present' | string;
  responsibilities: string[];
}

export interface Education {
  id: number;
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
}

export interface ResumeData {
  personalDetails: PersonalDetails;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  skills: string;
}

export interface SingleDutyAnalysis {
  isITDuty: boolean;
  duty: string;
  suggestedBullets?: string[];
  reasoning?: string;
  itEquivalent?: string;
  identifiedCerts?: string[];
}

export interface SuggestedDuty {
  duty: string;
  relevance: string;
}

export interface GeneratedProject {
  title: string;
  objective: string;
  tools: string;
  skills: string;
  deliverables: string;
  resumeBullet: string;
}


export interface AlignmentAnalysis {
  score: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

// Type for defining the JSON schema for the AI response
export interface GeneratedSummaryPayload {
    type: Type.OBJECT;
    properties: {
        summary: object;
        skills: object;
    };
}

export interface SuggestedDutiesPayload {
    type: Type.ARRAY;
    items: {
        type: Type.OBJECT;
        properties: {
            duty: { type: Type.STRING };
            relevance: { type: Type.STRING };
        };
        required: ['duty', 'relevance'];
    };
}

export interface GeneratedProjectsPayload {
    type: Type.OBJECT;
    properties: {
        projects: {
            type: Type.ARRAY;
            items: {
                type: Type.OBJECT;
                properties: {
                    title: { type: Type.STRING };
                    objective: { type: Type.STRING };
                    tools: { type: Type.STRING };
                    skills: { type: Type.STRING };
                    deliverables: { type: Type.STRING };
                    resumeBullet: { type: Type.STRING };
                };
            };
        };
    };
}

export interface ResumeParsingPayload {
    type: Type.OBJECT,
    properties: {
        personalDetails: {
            type: Type.OBJECT,
            properties: {
                fullName: { type: Type.STRING },
                email: { type: Type.STRING },
                phoneNumber: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                website: { type: Type.STRING },
            }
        },
        summary: { type: Type.STRING },
        experience: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.NUMBER },
                    jobTitle: { type: Type.STRING },
                    company: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        },
        education: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.NUMBER },
                    degree: { type: Type.STRING },
                    school: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                }
            }
        },
        projects: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.NUMBER },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                }
            }
        },
        skills: { type: Type.STRING },
    }
}
