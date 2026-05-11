// For local mobile development, you'll need to run 'vercel dev' and set EXPO_PUBLIC_API_URL to your computer's local IP (e.g., http://192.168.1.100:3000).
// For Vercel production web, it can just be an empty string, or automatically fallback.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

export const solveMCQ = async (base64Image) => {
  try {
    const response = await fetch(`${BASE_URL}/api/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Image }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error occurred');
    }

    return data.answer;
  } catch (error) {
    console.error("API Service Error:", error);
    throw new Error(error.message || "Failed to analyze image. Ensure the image is clear and try again.");
  }
};
