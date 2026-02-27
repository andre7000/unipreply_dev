import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';

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
  
  // Common patterns for comparisons
  const vsPattern = /(\w+(?:\s+\w+)?)\s+(?:vs\.?|versus|compared to|or)\s+(\w+(?:\s+\w+)?)/gi;
  const matches = message.matchAll(vsPattern);
  
  for (const match of matches) {
    if (match[1]) schools.push(match[1].trim());
    if (match[2]) schools.push(match[2].trim());
  }
  
  // Also look for known university names
  const knownSchools = ['yale', 'brown', 'harvard', 'princeton', 'columbia', 'cornell', 'dartmouth', 'penn', 'stanford', 'mit', 'duke', 'northwestern', 'berkeley', 'ucla'];
  for (const school of knownSchools) {
    if (message.toLowerCase().includes(school) && !schools.some(s => s.toLowerCase().includes(school))) {
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

    // Build system context
    let systemPrompt = `You are UniPreply Advisor, a helpful AI assistant for college admissions. You help students and parents navigate the college application process, understand admissions data, compare schools, and make informed decisions.

Be concise, friendly, and informative. When discussing specific colleges, use the Common Data Set (CDS) data provided below. If data is not available for a school, acknowledge that.

CRITICAL FORMATTING RULES - YOU MUST FOLLOW THESE:
1. NEVER use asterisks (*) for any purpose - no bold, no italics, no bullet points with asterisks
2. NEVER use markdown formatting of any kind
3. For bullet points, use dashes (-) only
4. Write school names in plain text, not bold: "Yale University" not "**Yale University**"
5. Keep responses clean and simple with plain text only`;

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
    } else if (schoolsToCompare.length > 0) {
      systemPrompt += `\n\nNote: No CDS data is currently available in the database for the mentioned schools. You can provide general information but note that specific statistics may not be current.`;
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
