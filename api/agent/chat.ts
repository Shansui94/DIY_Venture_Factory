import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- INLINED AI SERVICE (Refactored to use SDK) ---
import { GoogleGenerativeAI } from '@google/generative-ai';

const aiService = {
    async askSupervisor(query: string, contextData: any): Promise<string> {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
        console.log(`[AI Service] Using API Key: ${apiKey ? 'PRESENT' : 'MISSING'}`);

        try {
            const prompt = `
            Role: You are 'Titan', the Senior Production Manager for Packsecure. You are talking to the Factory Boss.
            Tone: Professional, Concise, Insightful, Data-Driven. NOT robotic.
            
            **YOUR GOAL:** 
            Don't just read the numbers. ANALYZE them. Tell the boss if production is on track, behind, or excellent. Identify bottlenecks.

            **LIVE DATA CONTEXT:**
            1. **Current Time**: ${new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Singapore" })} (Singapore Time)
            2. **Shift Status**: 
               - Today's Date: ${contextData.dailyStats.date}
               - Total Output: **${contextData.dailyStats.totalProductionCount} Sets**
               - Target (24h): ${contextData.machineStandards["T1.2-M01"].expected_daily_output_24h} Sets
            3. **Machine Health**:
               - Active Machines: ${contextData.activeMachines.length > 0 ? contextData.activeMachines.map((m: any) => m.machine_id).join(", ") : "None"}
               - Runtime: ${contextData.dailyStats.actualRuntimeMinutes} mins
               - Downtime Gaps: ${contextData.dailyStats.gapsFound.length > 0 ? JSON.stringify(contextData.dailyStats.gapsFound) : "None (Running Smoothly)"}

            **RECENT LOGS (Last 50 pulses):**
            ${JSON.stringify(contextData.recentLogs)}

            **STANDARDS:**
            - Machine: T1.2-M01
            - Standard Cycle Time: 299 seconds (~5 mins/set)

            **USER QUESTION:** "${query}"

            **INSTRUCTIONS FOR ANSWERING:**
            1. **Direct Answer**: Start with a direct answer to the user's question.
            2. **Efficiency Check**: 
               - Calculate: (Total Output / Target) * 100.
               - If < 80% of where it should be for this time of day, mark as ⚠️ BEHIND SCHEDULE.
               - If > 100%, mark as 🟢 EXCELLENT.
            3. **Gap Analysis**: If there are 'Downtime Gaps', mention them explicitly. "We lost ~X minutes today due to stoppages at [Time]..."
            4. **Cycle Time Check**: Look at the timestamps in 'Recent Logs'. Are they consistently around 5 mins apart? 
               - If > 6 mins apart, warn about "Slow Cycles".
               - If < 5 mins apart, praise "High Speed".
            5. **Language**: Reply in the **SAME LANGUAGE** as the user asked (Chinese if Chinese, English if English).

            **Make it sound like a real report to a boss, not a chatbot.**
            `;

            console.log("Using GoogleGenerativeAI SDK...");
            const genAI = new GoogleGenerativeAI(apiKey);

            // PAY-AS-YOU-GO Strategy: Prioritize 2.0 Flash (Smarter) over Lite
            const candidates = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"];

            let lastError;
            for (const modelId of candidates) {
                try {
                    console.log(`Trying model: ${modelId}...`);
                    const model = genAI.getGenerativeModel({ model: modelId });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();

                    if (text) return text;
                } catch (e: any) {
                    console.warn(`Model ${modelId} failed: ${e.message}`);
                    lastError = e;
                    // If it's a safety block or authenticaton error, failing other models might not help, but we retry anyway for 429s/404s
                }
            }

            throw lastError || new Error("All AI models failed to respond.");

        } catch (error: any) {
            console.error("AI Service Error:", error);
            // Return actual error for debugging
            return `AI Service Error: ${error.message || "Unknown error"}. (Key present: ${!!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)})`;
        }
    }
};
// --- END INLINED SERVICE ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });

        // 1. Gather Context
        const { data: activeMachines } = await supabase.from('machine_active_products').select('*');

        // FORCE CORRECT TIMEZONE (Asia/Singapore UTC+8)
        // This fixes the issue where Server (UTC) thinks it's yesterday
        const now = new Date();
        const sgTimeOption = { timeZone: "Asia/Singapore" };
        const sgNow = new Date(now.toLocaleString("en-US", sgTimeOption));

        // Calculate "Today" start in SG Time
        const sgTodayStart = new Date(sgNow);
        sgTodayStart.setHours(0, 0, 0, 0);
        // Note: Supabase stores timestamps in UTC. We need to convert our SG midnight back to UTC ISO string for querying.
        // But simply, we can actually just query based on the concept of "Day" logic or keep it simple:
        // Let's rely on the ISO string of the SG start time, but adjusting the timezone offset manually to get accurate UTC comparison if needed.
        // A simpler way for this specific app: Get logs > sgTodayStart (which IS correct local time object, but toISOString might revert to UTC)

        // Correct approach: Get the ISO string that represents SG Midnight in UTC
        // SG Midnight (00:00 SG) = Previous Day 16:00 UTC
        const queryDate = sgTodayStart.toISOString();



        // Get logs from "Today" (Local Perspective)
        const { data: rawLogs } = await supabase
            .from('production_logs')
            .select('*')
            .gte('created_at', queryDate)
            .order('created_at', { ascending: false })
            .limit(50);

        // Sanitize Data for AI
        const cleanLogs = rawLogs?.map(log => ({
            Timestamp: new Date(log.created_at).toLocaleTimeString("en-US", sgTimeOption), // Show local time in logs too
            Machine: log.machine_id,
            Product: log.product_sku,
            Lane: log.lane_id,
            Produced_Units: log.alarm_count
        })) || [];

        // 3a. Get Daily Statistics (Today - Local)
        const { count: totalTodayCount } = await supabase
            .from('production_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', queryDate);

        // 3b. Get Yesterday's Statistics (Local)
        const sgYesterday = new Date(sgTodayStart);
        sgYesterday.setDate(sgYesterday.getDate() - 1);
        const yesterdayQueryStr = sgYesterday.toISOString();

        const { count: totalYesterdayCount } = await supabase
            .from('production_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', yesterdayQueryStr)
            .lt('created_at', queryDate);

        // Fetch ALL logs for today for Gaps/Runtime calculation
        const { data: allDailyLogs } = await supabase
            .from('production_logs')
            .select('created_at, alarm_count')
            .gte('created_at', queryDate)
            .order('created_at', { ascending: true });

        // Calculate Gaps & Runtime
        let gaps: string[] = [];
        let actualRuntimeMinutes = 0;

        if (allDailyLogs && allDailyLogs.length > 1) {
            const firstLog = new Date(allDailyLogs[0].created_at);
            const lastLog = new Date(allDailyLogs[allDailyLogs.length - 1].created_at);
            actualRuntimeMinutes = (lastLog.getTime() - firstLog.getTime()) / (1000 * 60);

            for (let i = 1; i < allDailyLogs.length; i++) {
                const prev = new Date(allDailyLogs[i - 1].created_at);
                const curr = new Date(allDailyLogs[i].created_at);
                const diffMins = (curr.getTime() - prev.getTime()) / (1000 * 60);

                if (diffMins > 15) {
                    // Show gaps in local time
                    const prevLocal = prev.toLocaleTimeString("en-US", sgTimeOption);
                    const currLocal = curr.toLocaleTimeString("en-US", sgTimeOption);
                    gaps.push(`${prevLocal} to ${currLocal} (${Math.round(diffMins)}m)`);
                }
            }
        }

        // 4. Machine Standards
        const standards = {
            "T1.2-M01": {
                description: "Dual Lane Packaging Machine",
                standard_cycle_time_seconds: 299,
                expected_daily_output_24h: 578,
            }
        };

        const context = {
            activeMachines: activeMachines || [],
            recentLogs: cleanLogs,
            dailyStats: {
                totalProductionCount: totalTodayCount || 0,
                date: sgNow.toLocaleDateString("en-CA"),
                gapsFound: gaps,
                actualRuntimeMinutes: Math.round(actualRuntimeMinutes),
            },
            yesterdayStats: {
                totalProductionCount: totalYesterdayCount || 0,
                date: sgYesterday.toLocaleDateString("en-CA"),
            },
            machineStandards: standards,
            timestamp: sgNow.toLocaleString("en-US", sgTimeOption) // Tell AI the correct "Wall Clock" time
        };

        // 2. Ask AI (Inlined Service)
        const answer = await aiService.askSupervisor(query, context);

        return res.status(200).json({ response: answer });

    } catch (e: any) {
        console.error("AI Agent Error:", e);
        return res.status(500).json({ error: e.message || "Internal AI Error" });
    }
}
