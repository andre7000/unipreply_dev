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
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
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
  "organization": "sponsoring organization"
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

  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim().length < 10) {
    return res.status(400).json({ error: "Please provide scholarship text (at least 10 characters)" });
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
      embedding: embedding,
      embeddingModel: "text-embedding-004",
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "scholarships"), scholarshipDoc);

    return res.status(200).json({
      success: true,
      docId: docRef.id,
      metadata,
      embeddingDimension: embedding.length,
    });
  } catch (err) {
    console.error("Scholarship embed error:", err);
    return res.status(500).json({
      error: "Failed to process scholarship",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
