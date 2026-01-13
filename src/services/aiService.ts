export interface AIContentPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string; // Base64
    };
}

export const aiService = {
    async generateContent(systemPrompt: string, userContent: AIContentPart[], model: string = 'gemini-2.0-flash-exp'): Promise<any> {
        const apiKey = localStorage.getItem('google_api_key');
        if (!apiKey) throw new Error("Missing Google API Key");

        const payload = {
            contents: [{
                parts: [
                    { text: systemPrompt },
                    ...userContent
                ]
            }]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("No response from AI");

        // Attempt JSON extraction
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return text;
        } catch (e) {
            return text;
        }
    }
};
