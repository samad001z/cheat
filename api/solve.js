import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Allow CORS for local development and your Vercel deployment
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or restrict to your Vercel URL
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image } = req.body;
    
    if (!base64Image) {
      return res.status(400).json({ error: 'Missing base64Image in request body' });
    }

    // Initialize the Gemini API client SECURELY on the server
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      console.error("Missing GEMINI_API_KEY in server environment.");
      return res.status(500).json({ error: 'Server misconfiguration: API key missing' });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = "You are an expert academic solver specializing in Computer Science (OS, CN, DBMS), Aptitude, and Logical Reasoning. Analyze the image provided. If it contains a question or an MCQ: 1. Carefully extract the exact text of the question and the options. 2. Silently work through the logic, mathematical derivation, or technical facts required to solve it. 3. Double-check your reasoning for common trick questions. 4. Output ONLY the final correct option/answer and a very brief (1 sentence) justification. Do not output your internal reasoning steps. Format the output cleanly.";

    // Strip the data URI prefix (e.g., 'data:image/jpeg;base64,') if it exists (common on web)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const imageParts = [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg"
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ answer: text });
  } catch (error) {
    console.error("Server API Error:", error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
}
