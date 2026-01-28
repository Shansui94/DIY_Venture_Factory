const https = require('https');

const SUPABASE_URL = "https://kdahubyhwndgyloaljak.supabase.co/rest/v1";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8";

function fetchLogs(machineId) {
    const options = {
        hostname: 'kdahubyhwndgyloaljak.supabase.co',
        path: `/rest/v1/production_logs?machine_id=eq.${machineId}&select=*&order=created_at.desc&limit=5`,
        method: 'GET',
        headers: {
            'apikey': API_KEY,
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`--- Recent Logs for ${machineId} ---`);
            try {
                const json = JSON.parse(data);
                if (Array.isArray(json)) {
                    if (json.length === 0) {
                        console.log("No logs found.");
                    } else {
                        json.forEach(log => {
                            console.log(`[${log.created_at}] Count: ${log.alarm_count} | Trigger: ${log.trigger_source || 'Hardware'}`);
                        });
                    }
                } else {
                    console.log("Error:", json);
                }
            } catch (e) {
                console.log("Parse Error:", e);
                console.log("Raw Response:", data);
            }
        });
    });

    req.on('error', (e) => console.error(e));
    req.end();
}

fetchLogs('T1.2-M01');
