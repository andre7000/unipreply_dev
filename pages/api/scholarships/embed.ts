import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/config/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface ScholarshipMetadata {
  name: string;
  amount?: string;
  deadline?: string;
  eligibility?: string[];
  url?: string;
  organization?: string;
  scholarshipType?: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" });
  try {
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (embeddingError) {
    console.error("Embedding API failed, using fallback:", embeddingError);
    // Fallback: return empty array if embedding not available
    return [];
  }
}

async function extractMetadata(text: string): Promise<ScholarshipMetadata> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Extract scholarship information from this text. Return ONLY valid JSON with these fields (use null for missing info):
{
  "name": "scholarship name",
  "amount": "dollar amount or range",
  "deadline": "application deadline",
  "eligibility": ["eligibility requirement 1", "requirement 2"],
  "url": "application URL if present",
  "organization": "sponsoring organization",
  "scholarshipType": "one of: merit, need-based, athletic, rotc, departmental, diversity, stem, arts, community-service, or general"
}

Text:
${text}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("Metadata extraction error:", err);
  }

  const firstLine = text.split("\n")[0].trim().slice(0, 100);
  return { name: firstLine || "Unnamed Scholarship" };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, collegeId, collegeName, sourceUrl, studentType } = req.body;

  if (!text || typeof text !== "string" || text.trim().length < 10) {
    return res.status(400).json({ error: "Please provide scholarship text (at least 10 characters)" });
  }

  if (!collegeId) {
    return res.status(400).json({ error: "Please provide a collegeId" });
  }

  try {
    const [embedding, metadata] = await Promise.all([
      generateEmbedding(text.trim()),
      extractMetadata(text.trim()),
    ]);

    const scholarshipDoc = {
      rawText: text.trim(),
      name: metadata.name,
      amount: metadata.amount || null,
      deadline: metadata.deadline || null,
      eligibility: metadata.eligibility || [],
      url: metadata.url || null,
      organization: metadata.organization || null,
      collegeId: collegeId,
      collegeName: collegeName || null,
      sourceUrl: sourceUrl || null,
      studentType: studentType || "both",
      scholarshipType: metadata.scholarshipType || "general",
      embedding: embedding,
      embeddingModel: embedding.length > 0 ? "text-embedding-004" : null,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "scholarships"), scholarshipDoc);

    return res.status(200).json({
      success: true,
      docId: docRef.id,
      metadata,
      embeddingDimension: embedding.length,
      embeddingAvailable: embedding.length > 0,
    });
  } catch (err) {
    console.error("Scholarship embed error:", err);
    return res.status(500).json({
      error: "Failed to process scholarship",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
