import { useState } from 'react';

interface AIAction {
    type: 'FILTER' | 'CREATE_DRAFT' | 'ANALYZE' | 'NAVIGATE' | 'UNKNOWN';
    payload: any;
    reasoning: string;
}

export const useAICommand = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeCommand = async (userQuery: string, currentContext: any): Promise<AIAction> => {
        setLoading(true);
        setError(null);

        const apiKey = localStorage.getItem('google_api_key');
        if (!apiKey) {
            setLoading(false);
            throw new Error("No API Key found. Please configure it in Claims or Data settings.");
        }

        try {
            // 1. Construct System Prompt
            const systemPrompt = `
You are JARVIS, an AI Data Assistant for a factory management system.
Current Context: ${JSON.stringify(currentContext)}

Your goal is to map the user's natural language query to a JSON action.

# Supported Actions:
1. FILTER: User wants to see specific items (e.g. "red items", "machines in Factory A").
   Output: { type: "FILTER", payload: { keyword: "string" }, reasoning: "..." }
2. CREATE_DRAFT: User wants to add data (e.g. "New customer named Tesla").
   Output: { type: "CREATE_DRAFT", payload: { ...guessed_fields }, reasoning: "..." }
3. ANALYZE: User asks for insights (e.g. "How many active machines?").
   Output: { type: "ANALYZE", payload: { summary: "markdown string" }, reasoning: "..." }
4. NAVIGATE: User wants to switch tabs (e.g. "Go to Vehicles").
   Output: { type: "NAVIGATE", payload: { tabId: "items" | "vehicles" | "customers" | "machines" }, reasoning: "..." }

# Rules:
- Return ONLY valid JSON. No markdown formatting.
- Be precise.
            `;

            // 2. Call Gemini 2.0 Flash (Experimental)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: systemPrompt },
                            { text: `User Query: "${userQuery}"` }
                        ]
                    }]
                })
            });

            if (!response.ok) throw new Error("AI Service Failed: " + response.statusText);

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) throw new Error("No response from AI");

            // 3. Parse JSON
            const jsonStart = textResponse.indexOf('{');
            const jsonEnd = textResponse.lastIndexOf('}');
            const jsonStr = textResponse.substring(jsonStart, jsonEnd + 1);

            const result: AIAction = JSON.parse(jsonStr);
            return result;

        } catch (err: any) {
            console.error("AI Command Error:", err);
            setError(err.message);
            return { type: 'UNKNOWN', payload: {}, reasoning: "Failed to process command." };
        } finally {
            setLoading(false);
        }
    };

    return { executeCommand, loading, error };
};
