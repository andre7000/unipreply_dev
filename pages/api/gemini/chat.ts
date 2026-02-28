import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { colleges as collegeList } from '../../../data/dataSource';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Fetch CDS data for a college from Firestore
async function fetchCollegeCDS(collegeName: string): Promise<any | null> {
  try {
    // Normalize the college name for matching
    const normalizedName = collegeName.toLowerCase().trim();
    
    // Query Firestore for matching college data
    const collegeRef = collection(db, 'collegeDatasets');
    const snapshot = await getDocs(collegeRef);
    
    // Find matching document by institution name
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const institution = (data.Institution || data.A_General_Information?.A1_Address_Information?.Name_of_College_University || '').toLowerCase();
      
      if (institution.includes(normalizedName) || normalizedName.includes(institution.split(' ')[0])) {
        return { id: doc.id, ...data };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching CDS data:', error);
    return null;
  }
}

// Find college ID from name
function findCollegeId(collegeName: string): string | null {
  const normalizedName = collegeName.toLowerCase().trim()
    .replace(/^university of /i, '')
    .replace(/^uc /i, '')
    .replace(/ university$/i, '')
    .replace(/ college$/i, '')
    .trim();
  
  for (const college of collegeList) {
    const label = college.label.toLowerCase();
    const value = college.value.toLowerCase();
    
    // Exact match
    if (label === normalizedName || value === normalizedName) {
      console.log(`Exact match: ${collegeName} -> ${college.value}`);
      return college.value;
    }
    
    // Partial match - check if search term is in label/value or vice versa
    if (label.includes(normalizedName) || 
        normalizedName.includes(label) ||
        value.includes(normalizedName) ||
        normalizedName.includes(value)) {
      console.log(`Partial match: ${collegeName} -> ${college.value}`);
      return college.value;
    }
  }
  console.log(`No college match found for: ${collegeName} (normalized: ${normalizedName})`);
  return null;
}

// Fetch scholarships for a college from Firestore
async function fetchCollegeScholarships(collegeName: string): Promise<any[]> {
  try {
    const collegeId = findCollegeId(collegeName);
    console.log(`Fetching scholarships for collegeId: ${collegeId}`);
    
    const scholarshipsRef = collection(db, 'scholarships');
    
    if (collegeId) {
      // Try exact match first
      const q = query(scholarshipsRef, where('collegeId', '==', collegeId));
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} scholarships for ${collegeId}`);
      
      if (snapshot.docs.length > 0) {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    }
    
    // Fallback: search by collegeName field
    const allSnapshot = await getDocs(scholarshipsRef);
    const normalizedSearch = collegeName.toLowerCase();
    const matches = allSnapshot.docs.filter(doc => {
      const data = doc.data();
      const docCollegeName = (data.collegeName || '').toLowerCase();
      const docCollegeId = (data.collegeId || '').toLowerCase();
      return docCollegeName.includes(normalizedSearch) || 
             normalizedSearch.includes(docCollegeName.split(' ')[0]) ||
             docCollegeId.includes(normalizedSearch.replace(/\s+/g, '-'));
    });
    
    console.log(`Fallback found ${matches.length} scholarships for ${collegeName}`);
    return matches.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    return [];
  }
}

// Format scholarships for the AI prompt
function formatScholarshipsForPrompt(scholarships: any[], collegeName: string): string {
  if (scholarships.length === 0) {
    return `No scholarships found in our database for ${collegeName}. The school may offer scholarships not yet added to our system.`;
  }
  
  const sections: string[] = [`Found ${scholarships.length} scholarship(s) for ${collegeName}:\n`];
  
  for (const scholarship of scholarships) {
    // Try different possible field names
    const name = scholarship.metadata?.name || scholarship.metadata?.scholarshipName || scholarship.name || 'Unnamed Scholarship';
    const amount = scholarship.metadata?.amount || scholarship.amount;
    const deadline = scholarship.metadata?.deadline || scholarship.deadline;
    const eligibility = scholarship.metadata?.eligibility || scholarship.eligibility;
    
    sections.push(`- Name: ${name}`);
    if (amount) {
      sections.push(`  Amount: ${amount}`);
    }
    if (deadline) {
      sections.push(`  Deadline: ${deadline}`);
    }
    if (eligibility) {
      const eligText = Array.isArray(eligibility) ? eligibility.join(', ') : eligibility;
      sections.push(`  Eligibility: ${eligText}`);
    }
    if (scholarship.scholarshipType) {
      sections.push(`  Type: ${scholarship.scholarshipType}`);
    }
    if (scholarship.studentType && scholarship.studentType !== 'both') {
      sections.push(`  For: ${scholarship.studentType === 'first-year' ? 'First-year students' : 'Transfer students'}`);
    }
    if (scholarship.sourceUrl) {
      sections.push(`  More info: ${scholarship.sourceUrl}`);
    }
    if (scholarship.rawText) {
      // Include a snippet of raw text for context
      const snippet = scholarship.rawText.slice(0, 300).replace(/\n/g, ' ');
      sections.push(`  Details: ${snippet}...`);
    }
    sections.push('');
  }
  
  return sections.join('\n');
}

// Check if message is asking about scholarships
function isAskingAboutScholarships(message: string): boolean {
  const scholarshipKeywords = ['scholarship', 'scholarships', 'financial aid', 'merit aid', 'grant', 'grants', 'funding', 'tuition assistance'];
  const lowerMessage = message.toLowerCase();
  return scholarshipKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Format CDS data for inclusion in the AI prompt
function formatCDSForPrompt(data: any): string {
  const sections: string[] = [];
  
  // General Info
  const general = data.A_General_Information;
  if (general?.A1_Address_Information) {
    const addr = general.A1_Address_Information;
    sections.push(`Location: ${addr.City_State_Zip_Country || 'N/A'}`);
    sections.push(`Website: ${addr.WWW_Home_Page_Address || 'N/A'}`);
  }
  
  // Enrollment
  const enrollment = data.B_Enrollment_and_Persistence;
  if (enrollment?.B1_Institutional_Enrollment_By_Gender) {
    sections.push(`Total Undergraduates: ${enrollment.B1_Institutional_Enrollment_By_Gender.Total_all_Undergraduate || 'N/A'}`);
    sections.push(`Total Graduate: ${enrollment.B1_Institutional_Enrollment_By_Gender.Total_all_Graduate_and_Professional || 'N/A'}`);
  }
  if (enrollment?.B22_Retention_Rate) {
    sections.push(`Retention Rate: ${enrollment.B22_Retention_Rate}`);
  }
  
  // Admissions
  const admissions = data.C_First_Time_First_Year_Admission;
  if (admissions?.C1_Applications) {
    const apps = admissions.C1_Applications;
    sections.push(`Applications: ${apps.Total_applied || 'N/A'}`);
    sections.push(`Admitted: ${apps.Total_admitted || 'N/A'}`);
    if (apps.Total_applied && apps.Total_admitted) {
      const rate = ((apps.Total_admitted / apps.Total_applied) * 100).toFixed(1);
      sections.push(`Acceptance Rate: ${rate}%`);
    }
    sections.push(`Enrolled: ${apps.Total_enrolled || 'N/A'}`);
  }
  
  // Test Scores
  if (admissions?.C9_First_Time_First_Year_Profile) {
    const scores = admissions.C9_First_Time_First_Year_Profile;
    if (scores.SAT_Scores_25th_50th_75th_Percentiles?.Composite) {
      sections.push(`SAT Composite (25th/50th/75th): ${scores.SAT_Scores_25th_50th_75th_Percentiles.Composite.join('/')}`);
    }
    if (scores.ACT_Scores_25th_50th_75th_Percentiles?.Composite) {
      sections.push(`ACT Composite (25th/50th/75th): ${scores.ACT_Scores_25th_50th_75th_Percentiles.Composite.join('/')}`);
    }
    sections.push(`% Submitting SAT: ${scores.Percent_Submitting_SAT || 'N/A'}`);
    sections.push(`% Submitting ACT: ${scores.Percent_Submitting_ACT || 'N/A'}`);
  }
  
  // Costs
  const costs = data.G_Annual_Expenses;
  if (costs?.G1_Undergraduate_Full_Time_Costs_2025_2026) {
    const c = costs.G1_Undergraduate_Full_Time_Costs_2025_2026;
    sections.push(`Tuition: ${c.Tuition?.Private_Institutions || c.Tuition?.In_State || 'N/A'}`);
    sections.push(`Room & Board: ${c.Food_and_Housing_on_campus || 'N/A'}`);
  }
  
  // Financial Aid
  const aid = data.H_Financial_Aid;
  if (aid?.H2_Enrolled_Students_Awarded_Aid?.First_Time_Full_Time_Freshmen) {
    const fresh = aid.H2_Enrolled_Students_Awarded_Aid.First_Time_Full_Time_Freshmen;
    sections.push(`Avg Financial Aid Package: ${fresh.Average_financial_aid_package || 'N/A'}`);
    sections.push(`Avg Need-Based Grant: ${fresh.Average_need_based_scholarship_grant || 'N/A'}`);
  }
  
  // Class Size
  const faculty = data.I_Instructional_Faculty_and_Class_Size;
  if (faculty?.I2_Student_to_Faculty_Ratio) {
    sections.push(`Student-Faculty Ratio: ${faculty.I2_Student_to_Faculty_Ratio}`);
  }
  
  return sections.join('\n');
}

// Extract school names mentioned in the message for comparison
function extractSchoolNames(message: string): string[] {
  const schools: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  // Pattern for "University of X" or "X University"
  const uniOfPattern = /university\s+of\s+([\w\s]+?)(?:\s+have|\s+offer|\?|,|\.|\s+scholarship|\s+and|$)/gi;
  const uniPattern = /([\w\s]+?)\s+university(?:\s+have|\s+offer|\?|,|\.|\s+scholarship|\s+and|$)/gi;
  
  for (const match of message.matchAll(uniOfPattern)) {
    if (match[1]) schools.push(match[1].trim());
  }
  for (const match of message.matchAll(uniPattern)) {
    if (match[1] && match[1].length < 30) schools.push(match[1].trim());
  }
  
  // Common patterns for comparisons
  const vsPattern = /(\w+(?:\s+\w+)?)\s+(?:vs\.?|versus|compared to|or)\s+(\w+(?:\s+\w+)?)/gi;
  const vsMatches = message.matchAll(vsPattern);
  
  for (const match of vsMatches) {
    if (match[1]) schools.push(match[1].trim());
    if (match[2]) schools.push(match[2].trim());
  }
  
  // Also look for known university names
  const knownSchools = [
    'yale', 'brown', 'harvard', 'princeton', 'columbia', 'cornell', 'dartmouth', 'penn', 
    'stanford', 'mit', 'duke', 'northwestern', 'berkeley', 'ucla', 'usc', 'nyu',
    'washington', 'michigan', 'texas', 'florida', 'ohio state', 'georgia', 'virginia',
    'notre dame', 'vanderbilt', 'rice', 'emory', 'georgetown', 'carnegie mellon', 'johns hopkins',
    'uw', 'cal', 'purdue', 'illinois', 'wisconsin', 'maryland', 'rutgers', 'arizona'
  ];
  for (const school of knownSchools) {
    if (lowerMessage.includes(school) && !schools.some(s => s.toLowerCase().includes(school))) {
      schools.push(school);
    }
  }
  
  return [...new Set(schools)]; // Remove duplicates
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, context } = req.body as {
      messages: ChatMessage[];
      context?: {
        collegeName?: string;
        pageType?: string;
      };
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Get the last user message for analysis
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    // Extract schools to compare from the message
    const schoolsToCompare = extractSchoolNames(lastUserMessage);
    
    // Add current college if not already included
    if (context?.collegeName && !schoolsToCompare.some(s => 
      s.toLowerCase().includes(context.collegeName!.toLowerCase().split(' ')[0]) ||
      context.collegeName!.toLowerCase().includes(s.toLowerCase())
    )) {
      schoolsToCompare.unshift(context.collegeName);
    }
    
    // Fetch CDS data for mentioned schools
    const cdsDataMap: Record<string, any> = {};
    for (const school of schoolsToCompare.slice(0, 3)) { // Limit to 3 schools
      const cdsData = await fetchCollegeCDS(school);
      if (cdsData) {
        cdsDataMap[school] = cdsData;
      }
    }

    // Check if asking about scholarships and fetch if needed
    const askingAboutScholarships = isAskingAboutScholarships(lastUserMessage);
    const scholarshipsMap: Record<string, any[]> = {};
    
    if (askingAboutScholarships) {
      for (const school of schoolsToCompare.slice(0, 3)) {
        const scholarships = await fetchCollegeScholarships(school);
        scholarshipsMap[school] = scholarships;
      }
    }

    // Build system context
    let systemPrompt = `You are Unipreply Advisor, a helpful AI assistant for college admissions. You help students and parents navigate the college application process, understand admissions data, compare schools, and make informed decisions.

Be concise, friendly, and informative. When discussing specific colleges, use the Common Data Set (CDS) data provided below. If data is not available for a school, acknowledge that.

FORMATTING RULES:
1. Do NOT use asterisks (*) for bold or italics
2. For bullet points, use dashes (-) only
3. Write school names in plain text, not bold
4. When comparing 2+ schools, ALWAYS use a simple text table format like this:

Metric            | Yale    | Brown
------------------|---------|--------
Acceptance Rate   | 3.9%    | 5.4%
SAT Middle 50%    | 1480-1560| 1510-1560

5. Tables make comparisons much easier to read - use them!`;

    if (context?.collegeName) {
      systemPrompt += `\n\nThe user is currently viewing the page for ${context.collegeName}.`;
    }
    
    // Add CDS data to context
    if (Object.keys(cdsDataMap).length > 0) {
      systemPrompt += `\n\n=== COMMON DATA SET INFORMATION ===\n`;
      for (const [school, data] of Object.entries(cdsDataMap)) {
        systemPrompt += `\n--- ${data.Institution || school} (${data.Common_Data_Set || 'CDS'}) ---\n`;
        systemPrompt += formatCDSForPrompt(data);
      }
      systemPrompt += `\n=== END CDS DATA ===`;
    } else if (schoolsToCompare.length > 0 && !askingAboutScholarships) {
      systemPrompt += `\n\nNote: No CDS data is currently available in the database for the mentioned schools. You can provide general information but note that specific statistics may not be current.`;
    }

    // Add scholarship data if user is asking about scholarships
    if (askingAboutScholarships && Object.keys(scholarshipsMap).length > 0) {
      systemPrompt += `\n\n=== SCHOLARSHIP INFORMATION ===\n`;
      for (const [school, scholarships] of Object.entries(scholarshipsMap)) {
        systemPrompt += formatScholarshipsForPrompt(scholarships, school);
      }
      systemPrompt += `\n=== END SCHOLARSHIP DATA ===`;
      systemPrompt += `\n\nIMPORTANT FORMATTING for scholarship responses:
1. Start with a brief intro sentence
2. Then show each scholarship in a clearly separated block using this format:

---
SCHOLARSHIP: [Name]
Amount: [amount]
Deadline: [deadline]
Eligibility: [requirements]
Type: [scholarship type]
More Info: [URL]
---

3. Use the dashed lines (---) to create visual separation between scholarships
4. Always include the source URL at the end
5. Keep the scholarship data visually distinct from your commentary`;
    }

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    // Start chat with history
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: systemPrompt }] },
        ...history,
      ],
    });

    // Set up streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      let text = chunk.text();
      if (text) {
        // Strip markdown bold/italic formatting
        text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove **bold**
        text = text.replace(/\*([^*]+)\*/g, '$1');     // Remove *italic*
        text = text.replace(/__([^_]+)__/g, '$1');     // Remove __bold__
        text = text.replace(/_([^_]+)_/g, '$1');       // Remove _italic_
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for rate limit error
    const isRateLimit = errorMessage.includes('429') || errorMessage.includes('quota');
    const userMessage = isRateLimit 
      ? 'Rate limit exceeded. Please wait a minute and try again.'
      : errorMessage;
    
    if (!res.headersSent) {
      res.status(isRateLimit ? 429 : 500).json({ error: userMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
      res.end();
    }
  }
}
