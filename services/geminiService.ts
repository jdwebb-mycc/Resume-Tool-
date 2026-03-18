
import { GoogleGenAI, Type } from "@google/genai";
export interface AlignmentAnalysis {
  score: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

import { ResumeData, SingleDutyAnalysis, GeneratedSummaryPayload, ResumeParsingPayload, SuggestedDutiesPayload, GeneratedProject, GeneratedProjectsPayload, SuggestedDuty, AlignmentAnalysis } from '../types';

// ... existing code ...

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple in-memory cache to reduce API calls and handle shared rate limits
const apiCache = new Map<string, unknown>();

const getFromCache = (key: string) => apiCache.get(key);
const setToCache = (key: string, value: unknown) => {
    // Keep cache size reasonable
    if (apiCache.size > 100) {
        const firstKey = apiCache.keys().next().value;
        if (firstKey !== undefined) apiCache.delete(firstKey);
    }
    apiCache.set(key, value);
};

// Helper for retrying API calls with exponential backoff
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error: unknown) {
        // Check if it's a rate limit error (429) or a server error (5xx)
        const err = error as { message?: string; status?: number };
        const isRateLimit = err?.message?.includes('429') || err?.status === 429;
        const isServerError = err?.message?.includes('500') || err?.message?.includes('503') || err?.status >= 500;
        
        if ((isRateLimit || isServerError) && retries > 0) {
            console.warn(`API error (${err?.status || 'unknown'}). Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

export const analyzeResumeAlignment = async (resumeData: ResumeData, jobDescription: string): Promise<AlignmentAnalysis> => {
    const cacheKey = `alignment-${JSON.stringify(resumeData)}-${jobDescription}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const model = 'gemini-flash-latest';
    const prompt = `
        Act as an expert ATS (Applicant Tracking System) and technical recruiter. 
        Your task is to analyze the alignment between a candidate's resume and a target job description.

        **Resume Data:**
        ${JSON.stringify(resumeData)}

        **Job Description:**
        ${jobDescription}

        **Instructions:**
        1.  Evaluate the overall alignment on a scale of 0 to 100.
        2.  Identify matching keywords and skills present in both.
        3.  Identify critical missing keywords or skills from the job description that are not in the resume.
        4.  Highlight the strengths of the resume in relation to this specific job.
        5.  Identify weaknesses or gaps.
        6.  Provide 3-5 actionable suggestions to improve the alignment.
        7.  Respond strictly in the JSON format specified by the schema.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.NUMBER },
            matchingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['score', 'matchingKeywords', 'missingKeywords', 'strengths', 'weaknesses', 'suggestions']
    };

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema },
        }));
        const jsonText = response.text?.trim();
        if (jsonText) {
            const result = JSON.parse(jsonText) as AlignmentAnalysis;
            setToCache(cacheKey, result);
            return result;
        } else {
            throw new Error('Alignment analysis returned an empty response.');
        }
    } catch (error) {
        console.error("Error analyzing alignment with Gemini:", error);
        throw new Error("Failed to analyze alignment from Gemini API.");
    }
};

// Removed duplicate ai initialization from here
const certificationKnowledgeBase = `
    ### CompTIA A+
    - **Focus:** IT support, hardware, operating systems, troubleshooting.
    - **Core Domains:** PC hardware (CPU, RAM, storage), mobile devices, OS (Windows, macOS, Linux), software installation, basic networking, troubleshooting methodology, security basics, virtualization, customer support.
    - **Skills Gained:** Diagnose/repair hardware/software, install/configure OS, basic network setup, apply entry-level security, provide tech support.

    ### CompTIA Network+
    - **Focus:** Networking concepts, infrastructure, and troubleshooting.
    - **Core Domains:** OSI & TCP/IP models, IP addressing & subnetting, routing & switching, wired/wireless networking, network protocols (DNS, DHCP), network security fundamentals, network monitoring, troubleshooting.
    - **Skills Gained:** Configure/manage networks, diagnose connectivity, understand data flow, secure network infrastructure.

    ### CompTIA Security+
    - **Focus:** Cybersecurity fundamentals and risk management.
    - **Core Domains:** Threats, attacks, vulnerabilities, malware, cryptography (encryption, PKI), identity and access management, network security, risk management, incident response.
    - **Skills Gained:** Identify threats, implement security controls, manage access, respond to incidents, apply encryption.

    ### CompTIA CySA+ (Cybersecurity Analyst)
    - **Focus:** Threat detection, analysis, and response.
    - **Core Domains:** Security operations, threat intelligence, log analysis & SIEM, vulnerability management, incident detection/response, forensics basics, behavioral detection.
    - **Skills Gained:** Analyze security logs, detect attacks, investigate incidents, perform threat hunting.

    ### CompTIA Linux+
    - **Focus:** Linux system administration.
    - **Core Domains:** Command-line, file systems/permissions, process management, package management, networking in Linux, shell scripting, security configuration, system troubleshooting.
    - **Skills Gained:** Manage Linux systems, use terminal commands, configure users, automate tasks with scripts, secure servers.

    ### Microsoft Azure
    - **Focus:** Cloud computing fundamentals, Azure services, and cloud management.
    - **Core Domains:** Core cloud concepts (IaaS, PaaS, SaaS), Azure architecture, compute (Virtual Machines, App Service), storage (Blob Storage, File Storage), networking (Virtual Networks, Load Balancers), identity (Azure Active Directory / Entra ID), security (Security Center, Network Security Groups), governance and compliance.
    - **Skills Gained:** Deploy and manage virtual machines, configure cloud storage solutions, establish secure virtual networks, manage user identities and access in the cloud, monitor cloud resources for performance and security.
`;

const actionVerbsKnowledgeBase = `
### Action Verbs
- **LEADERSHIP:** Accomplished, Achieved, Administered, Analyzed, Assigned, Attained, Chaired, Consolidated, Contracted, Coordinated, Delegated, Developed, Directed, Earned, Evaluated, Executed, Handled, Headed, Impacted, Improved, Increased, Led, Mastered, Orchestrated, Organized, Oversaw, Planned, Predicted, Prioritized, Produced, Proved, Recommended, Regulated, Reorganized, Reviewed, Scheduled, Spearheaded, Strengthened, Supervised, Surpassed
- **COMMUNICATION:** Addressed, Arbitrated, Arranged, Authored, Collaborated, Convinced, Corresponded, Delivered, Developed, Directed, Documented, Drafted, Edited, Energized, Enlisted, Formulated, Influenced, Interpreted, Lectured, Liaised, Mediated, Moderated, Negotiated, Persuaded, Presented, Promoted, Publicized, Reconciled, Recruited, Reported, Rewrote, Spoke, Suggested, Synthesized, Translated, Verbalized, Wrote
- **RESEARCH:** Clarified, Collected, Concluded, Conducted, Constructed, Critiqued, Derived, Determined, Diagnosed, Discovered, Evaluated, Examined, Extracted, Formed, Identified, Inspected, Interpreted, Interviewed, Investigated, Modeled, Organized, Resolved, Reviewed, Summarized, Surveyed, Systematized, Tested
- **TECHNICAL:** Assembled, Built, Calculated, Computed, Designed, Devised, Engineered, Fabricated, Installed, Maintained, Operated, Optimized, Overhauled, Programmed, Remodeled, Repaired, Solved, Standardized, Streamlined, Upgraded
- **TEACHING:** Adapted, Advised, Clarified, Coached, Communicated, Coordinated, Demystified, Developed, Enabled, Encouraged, Evaluated, Explained, Facilitated, Guided, Informed, Instructed, Persuaded, Set Goals, Stimulated, Studied, Taught, Trained
- **QUANTITATIVE:** Administered, Allocated, Analyzed, Appraised, Audited, Balanced, Budgeted, Calculated, Computed, Developed, Forecasted, Managed, Marketed, Maximized, Minimized, Planned, Projected, Researched
- **CREATIVE:** Acted, Composed, Conceived, Conceptualized, Created, Customized, Designed, Developed, Directed, Established, Fashioned, Founded, Illustrated, Initiated, Instituted, Integrated, Introduced, Invented, Originated, Performed, Planned, Published, Redesigned, Revised, Revitalized, Shaped, Visualized
- **HELPING:** Assessed, Assisted, Clarified, Coached, Counseled, Demonstrated, Diagnosed, Educated, Enhanced, Expedited, Facilitated, Familiarized, Guided, Motivated, Participated, Proposed, Provided, Referred, Rehabilitated, Represented, Served, Supported
- **ORGANIZATIONAL:** Approved, Accelerated, Added, Arranged, Broadened, Cataloged, Centralized, Changed, Classified, Collected, Compiled, Completed, Controlled, Defined, Dispatched, Executed, Expanded, Gained, Gathered, Generated, Implemented, Inspected, Launched, Monitored, Operated, Organized, Prepared, Processed, Purchased, Recorded, Reduced, Reinforced, Retrieved, Screened, Selected, Simplified, Sold, Specified, Steered, Structured, Systematized, Tabulated, Unified, Updated, Utilized, Validated, Verified
`;

const resumeBestPractices = `
### Core Resume Principles
- **Be Specific & Fact-Based:** Quantify achievements whenever possible (e.g., 'Increased efficiency by 15%', 'Reduced costs by $10k'). Use numbers to show impact.
- **Use Active Language:** Start every bullet point with a strong action verb. Avoid passive phrases like "Responsible for...".
- **Tailor Content:** The content must be relevant to the target position.
- **Format for Clarity:** Ensure the resume is easy to read and scan quickly. Use consistent formatting and balance white space.
- **Avoid Common Pitfalls:**
    - Do not use personal pronouns (I, my, we).
    - Do not use a narrative or conversational style.
    - Do not include personal information like age, photos, or marital status.
    - List experience in reverse chronological order (most recent first).
`;

export const parseResumeText = async (resumeText: string): Promise<ResumeData> => {
    const cacheKey = `parse-${resumeText.substring(0, 1000)}`; // Use a prefix of text as key
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const model = 'gemini-flash-latest';
    const prompt = `
        You are an expert resume parsing AI. Analyze the raw text from a resume below and extract the information into the structured JSON format specified by the schema.

        **Parsing Instructions:**
        - For 'experience', 'education', and 'projects' sections, create a separate object for each distinct entry.
        - Assign a unique numeric 'id' to each experience, education, and project object. A timestamp or simple counter is fine.
        - For 'responsibilities' within each job, split the bullet points or descriptive text into an array of strings. Each string in the array should represent a single bullet point or line item.
        - For dates, attempt to extract them as-is. 'Present' is a valid end date. If dates are missing, use empty strings.
        - For 'skills', aggregate all technical skills into a single comma-separated string. **Do not include certification titles (e.g., "CompTIA A+") in the skills list; these should be captured in the education/certifications section if present.**
        - If a section is not present in the resume text, return an empty value (e.g., "" for strings, [] for arrays). Do not invent information.

        **Resume Text to Parse:**
        ---
        ${resumeText}
        ---
    `;

    const responseSchema: ResumeParsingPayload = {
        type: Type.OBJECT,
        properties: {
            personalDetails: {
                type: Type.OBJECT,
                properties: {
                    fullName: { type: Type.STRING }, email: { type: Type.STRING }, phoneNumber: { type: Type.STRING },
                    linkedin: { type: Type.STRING }, website: { type: Type.STRING },
                }
            },
            summary: { type: Type.STRING },
            experience: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.NUMBER }, jobTitle: { type: Type.STRING }, company: { type: Type.STRING },
                        startDate: { type: Type.STRING }, endDate: { type: Type.STRING },
                        responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            },
            education: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.NUMBER }, degree: { type: Type.STRING }, school: { type: Type.STRING },
                        startDate: { type: Type.STRING }, endDate: { type: Type.STRING },
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
    };

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema },
        }));
        const jsonText = response.text?.trim();
        if (jsonText) {
            // Ensure IDs are unique if the model provides duplicates
            const parsed = JSON.parse(jsonText) as ResumeData;
            parsed.experience = parsed.experience.map((exp, index) => ({ ...exp, id: Date.now() + index }));
            parsed.education = parsed.education.map((edu, index) => ({ ...edu, id: Date.now() + 1000 + index }));
            parsed.projects = parsed.projects?.map((proj, index) => ({ ...proj, id: Date.now() + 2000 + index })) || [];
            
            setToCache(cacheKey, parsed);
            return parsed;
        } else {
            throw new Error('Resume parsing returned an empty response.');
        }
    } catch (error) {
        console.error("Error parsing resume with Gemini:", error);
        throw new Error("Failed to parse resume from Gemini API.");
    }
};

export const analyzeSingleDuty = async (duty: string, selectedCerts: string[], experienceLevel: string, jobDescription?: string): Promise<SingleDutyAnalysis> => {
    const cacheKey = `duty-${duty}-${selectedCerts.join(',')}-${experienceLevel}-${jobDescription || ''}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const model = 'gemini-flash-latest';

    const contextText = selectedCerts.length > 0
        ? `- Certifications Held: ${JSON.stringify(selectedCerts)}`
        : `- Certifications Held: None. The candidate is currently learning these skills in their academic program.`;

    const guidanceText = selectedCerts.length > 0
        ? `All suggestions must align with the knowledge domains of the 'Certifications Held' list.`
        : `All suggestions must align with the knowledge domains of an IT professional learning the material for the certifications listed in the knowledge base (as this reflects their program's curriculum).`;

    const jdContext = jobDescription ? `
        ### Target Job Description
        ${jobDescription}
        
        **Additional Instruction:** Tailor the enhanced bullet points to match the requirements and keywords found in this job description.
    ` : '';

    const prompt = `
        Act as a precise IT and cybersecurity Subject Matter Expert (SME) and career coach.
        Your task is to analyze a single professional duty and generate enhanced resume bullet points based on the user's qualifications and established resume best practices.

        ### Internal Knowledge Base (For Your Reference)
        ${certificationKnowledgeBase}
        ${actionVerbsKnowledgeBase}
        ${resumeBestPractices}

        ### Candidate Context
        ${contextText}
        - Stated Experience Level: ${experienceLevel}
        ${jdContext}

        ### Analysis & Generation Rules
        1.  **Analyze the Duty:** Determine if the provided duty is a genuine, hands-on technical IT task.
        2.  **If IT Duty:**
            -   Set 'isITDuty' to true.
            -   Generate an array of 3-4 enhanced, ATS-friendly resume bullet points in 'suggestedBullets'.
            -   **CRITICAL: All suggestions must strictly adhere to the 'Core Resume Principles'.**
            -   Each bullet point MUST start with a strong action verb, preferably from the 'Action Verbs' list.
            -   Focus on **quantifying impact**. Rephrase the duty to show a measurable outcome (e.g., 'Increased X by 20%', 'Reduced Y by 15%', 'Managed a budget of $Z').
            -   **Crucially, ${guidanceText}**
            -   Avoid personal pronouns (I, my) and passive language.
        3.  **If NOT an IT Duty:**
            -   Set 'isITDuty' to false.
            -   Provide a brief 'reasoning' (5 words or less).
            -   Suggest a tangible 'itEquivalent' task that aligns with the user's program of study.
        4.  **Output Format:** Respond strictly in the JSON format specified in the schema.

        ### Duty to Analyze
        ---
        ${duty}
        ---
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            isITDuty: { type: Type.BOOLEAN },
            duty: { type: Type.STRING },
            suggestedBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING },
            itEquivalent: { type: Type.STRING },
            identifiedCerts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['isITDuty', 'duty']
    };

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema },
        }));
        const jsonText = response.text?.trim();
        if (jsonText) {
            const result = JSON.parse(jsonText) as SingleDutyAnalysis;
            setToCache(cacheKey, result);
            return result;
        } else {
            throw new Error('Analysis returned an empty response.');
        }
    } catch (error) {
        console.error("Error analyzing duty with Gemini:", error);
        throw new Error("Failed to analyze duty from Gemini API.");
    }
};

export const generateResumeSummaryAndSkills = async (selectedBullets: string[], jobDescription: string, selectedCerts: string[]): Promise<{ summary: string; skills: string; }> => {
    const cacheKey = `summary-${selectedBullets.join(',')}-${jobDescription}-${selectedCerts.join(',')}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const model = 'gemini-flash-latest';
    
    const contextText = selectedCerts.length > 0
        ? `- Certifications Held: ${JSON.stringify(selectedCerts)}`
        : `- Certifications Held: None. The candidate is building these skills through their academic program.`;

    const summaryInstruction = selectedCerts.length > 0
        ? `The summary must incorporate the candidate's certifications.`
        : `The summary should highlight the key areas of study and skills being developed in their program. Do not mention certifications.`;

    const skillsInstruction = `Compile a comma-separated list of key technical skills, tools, and platforms derived *only* from the provided bullets and relevant to their field of study. **CRITICAL: Do not include certification titles (e.g., "CompTIA A+", "Security+") in this list.**`;
        
    const prompt = `
        Act as an expert technical resume writer. Your task is to generate a professional summary and a skills list based on provided resume bullets, qualifications, and an optional job description.

        **Candidate Context:**
        ${contextText}
        - User-Selected Bullets: ${JSON.stringify(selectedBullets)}
        
        ${jobDescription ? `
        **Job Description to Target:**
        ---
        ${jobDescription}
        ---
        ` : ''}

        **Generation Instructions:**
        1.  **Professional Summary:** Write a compelling 2-4 sentence executive summary. This should be a high-impact pitch. Avoid generic statements and focus on key, quantifiable achievements from the bullets. ${summaryInstruction}
            ${jobDescription
            ? "Then, you MUST tailor this summary to the **Job Description to Target**. Analyze its requirements (especially preferred requirements) and highlight the user's skills and experiences from the selected bullets that are the strongest match. The goal is to make the candidate an obvious fit for the role."
            : "Highlight the key technical skills and themes present in the selected bullets."
        }
        2.  **Skills Section:** ${skillsInstruction}
        3.  **Output Format:** Respond *only* with a single JSON object matching the provided schema.
    `;
    
    const responseSchema: GeneratedSummaryPayload = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING },
            skills: { type: Type.STRING }
        }
    };

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema },
        }));

        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("Summary generation returned an empty response.");
        }
        const result = JSON.parse(jsonText);
        setToCache(cacheKey, result);
        return result;
    } catch (error) {
        console.error("Error generating summary with Gemini:", error);
        throw new Error("Failed to generate summary from Gemini API.");
    }
};

export const generateSuggestedDuties = async (program: string, certs: string[], experienceLevel: string, jobTitle: string, jobDescription: string): Promise<SuggestedDuty[]> => {
    const cacheKey = `suggested-${program}-${certs.join(',')}-${experienceLevel}-${jobTitle}-${jobDescription}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const model = 'gemini-flash-latest';

    const contextText = `- Certifications: ${certs.length > 0 ? JSON.stringify(certs) : 'None. Focus on skills learned in the program.'}`;
    const instructionText = certs.length > 0
        ? `- Ensure the duties directly relate to the listed certifications.`
        : `- Ensure the duties directly relate to the curriculum of the student's program, which covers topics from the certifications in the knowledge base.`;

    const jobDescriptionContext = jobDescription 
        ? `The candidate may be applying for a role similar to this Target Job Description: \n---\n${jobDescription}\n---\n` 
        : '';

    const skillTranslationGuidance = (experienceLevel.includes('No Computer Experience') || experienceLevel.includes('Home User Experience'))
        ? `
        **Skill Translation Mandate:**
        Since the student has minimal to no formal IT work experience, it is CRITICAL to translate skills from non-IT contexts (like retail, customer service, food service, manual labor, etc.) into relevant, entry-level IT duties for the specified job title.
        - For a student with customer service experience, suggest a duty like: "Provided technical support to users by patiently listening to issues and clearly explaining solutions." with relevance: "Translates customer service skills into a help desk context."
        - For a student with inventory experience, suggest: "Managed and tracked hardware assets using spreadsheets." with relevance: "Translates inventory management into IT asset tracking."
        Focus on soft skills (communication, problem-solving, organization) and apply them to foundational IT tasks.
        `
        : '';

    const prompt = `
        You are a career development coach for students entering the IT field.
        Based on the student's program, qualifications, and experience, generate a list of 5-7 practical, hands-on tasks they could add to their resume for a specific job.
        These tasks should be phrased as simple duties (e.g., 'Installed and configured Windows 10 on new workstations').
        For each duty, provide a short 'relevance' string explaining why it's a good suggestion, such as how it translates a non-IT skill or applies a specific certification.

        **Certification Knowledge Base (For Your Reference):**
        ${certificationKnowledgeBase}

        **Candidate Context:**
        - Program: ${program}
        ${contextText}
        - Experience Level: ${experienceLevel}
        - Job Title on Resume: "${jobTitle}"
        ${jobDescriptionContext}

        **Instructions:**
        - Generate duties specifically tailored for the "${jobTitle}" role, considering the candidate's overall context.
        - Generate duties appropriate for the experience level. For lower experience, focus on foundational tasks.
        ${instructionText}
        ${skillTranslationGuidance}
        - The output must be a JSON array of objects, where each object has a "duty" (string) and a "relevance" (string).
    `;

    const responseSchema: SuggestedDutiesPayload = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                duty: { type: Type.STRING },
                relevance: { type: Type.STRING }
            },
            required: ['duty', 'relevance']
        }
    };

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema },
        }));
        const jsonText = response.text?.trim();
        if (jsonText) {
            const result = JSON.parse(jsonText);
            setToCache(cacheKey, result);
            return result;
        }
        return [];
    } catch (error) {
        console.error("Error generating suggested duties with Gemini:", error);
        throw new Error("Failed to generate suggested duties from Gemini API.");
    }
};

export const generateSkills = async (resumeData: ResumeData, jobDescription: string, selectedCerts: string[]): Promise<string[]> => {
    const cacheKey = `skills-${JSON.stringify(resumeData)}-${jobDescription}-${selectedCerts.join(',')}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const model = 'gemini-flash-latest';

    const staticSkills = ["Classless IP Addressing", "Microsoft Office", "Ubuntu", "Windows 11", "Mac OSX", "Android/iOS", "Windows Server 2024", "Windows Server 2025", "VMware", "Adobe Acrobat", "VPN"];

    const prompt = `
        You are an expert IT resume analyst. Your task is to extract a comprehensive list of technical skills from the provided resume data, job description, and certifications.

        **Resume Data:**
        ${JSON.stringify(resumeData)}

        **Job Description:**
        ${jobDescription}

        **Certifications:**
        ${selectedCerts.join(', ')}

        **Instructions:**
        1.  Analyze the resume data (summary, experience, projects) and the job description to identify all relevant technical skills.
        2.  Include skills related to the provided certifications, but **DO NOT include the certification titles themselves** (e.g., do not include "CompTIA A+", instead include "Hardware Troubleshooting").
        3.  Return a single JSON array of unique skill strings. Do not include duplicates.
        4.  Do not include the static skills provided in the static list.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: { type: Type.STRING },
    };

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema },
        }));
        const jsonText = response.text?.trim();
        if (jsonText) {
            const generatedSkills = JSON.parse(jsonText) as string[];
            const allSkills = [...staticSkills, ...generatedSkills];
            const uniqueSkills = [...new Set(allSkills)];
            setToCache(cacheKey, uniqueSkills);
            return uniqueSkills;
        } else {
            return staticSkills;
        }
    } catch (error) {
        console.error("Error generating skills with Gemini:", error);
        return staticSkills;
    }
};

export const generateProjects = async (certification: string, experienceLevel: string, jobDescription?: string): Promise<GeneratedProject[]> => {
    const cacheKey = `projects-${certification}-${experienceLevel}-${jobDescription || ''}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const model = 'gemini-flash-latest';
    
    const jdContext = jobDescription ? `
        ### Target Job Description
        ${jobDescription}
        
        **Additional Instruction:** Prioritize generating projects that demonstrate skills and tools specifically mentioned in this job description.
    ` : '';

    const prompt = `
        You are an expert IT career coach and curriculum designer. Your task is to generate realistic, resume-worthy class projects for a student based on their completed certification and experience level.

        **Inputs:**
        - Certification Completed: ${certification}
        - Program Experience Level: ${experienceLevel}
        ${jdContext}

        **Output Requirements:**
        - Generate 3-5 hands-on projects appropriate for the inputs.
        - Each project MUST include:
            1.  **Project Title:** A clear, descriptive name.
            2.  **Business or Technical Objective:** The "why" behind the project in a real-world context.
            3.  **Tools / Technologies Used:** A comma-separated list aligned with the certification.
            4.  **Core Skills Demonstrated:** ATS-friendly keywords.
            5.  **Deliverables:** What the student actually produces (e.g., "A configured router file," "A detailed incident report," "A functional PowerShell script").
            6.  **Resume-Ready Bullet Point:** A single, impactful bullet point written in the past tense. It should quantify the outcome where possible.

        **Scoping Rules based on Experience Level:**
        - **Beginner:** Focus on guided, task-based projects. Foundational execution. Examples: building a PC, basic network cabling, installing an OS.
        - **Intermediate:** Focus on configuration, troubleshooting, analysis, and documentation. Examples: setting up a SOHO network, basic server configuration, writing hardening checklists.
        - **Advanced:** Focus on design, optimization, security hardening, incident response, or automation. Examples: designing a small office network topology, scripting user onboarding, analyzing malware behavior in a sandbox.

        **Constraint:**
        - Avoid purely theoretical labs. Every project must map to real employer expectations for roles like Help Desk, Network Technician, Systems Administrator, SOC Analyst, or Junior Cloud Administrator.
        - Respond ONLY in the JSON format specified by the schema. No filler language.
    `;

    const responseSchema: GeneratedProjectsPayload = {
        type: Type.OBJECT,
        properties: {
            projects: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        objective: { type: Type.STRING },
                        tools: { type: Type.STRING },
                        skills: { type: Type.STRING },
                        deliverables: { type: Type.STRING },
                        resumeBullet: { type: Type.STRING },
                    },
                },
            },
        },
    };

    try {
        const response = await withRetry(() => ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema },
        }));
        const jsonText = response.text?.trim();
        if (jsonText) {
            const result = JSON.parse(jsonText);
            const projects = result.projects || [];
            setToCache(cacheKey, projects);
            return projects;
        }
        return [];
    } catch (error) {
        console.error("Error generating projects with Gemini:", error);
        throw new Error("Failed to generate projects from Gemini API.");
    }
};
