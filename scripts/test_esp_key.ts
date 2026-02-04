
// Exact credentials from firmware
const url = "https://kdahubyhwndgyloaljak.supabase.co/rest/v1/production_logs";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8";

async function testInsert() {
    console.log("Testing POST to Supabase using ESP32 Key (Fetch API)...");

    // Simulate firmware payload
    const payload = {
        machine_id: "TEST-ESP32-DIAG",
        alarm_count: 1,
        created_at: new Date().toISOString()
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "apikey": key,
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("✅ Success! Status:", response.status, response.statusText);
        } else {
            console.error("❌ Failed!");
            console.error("Status:", response.status, response.statusText);
            const text = await response.text();
            console.error("Body:", text);
        }

    } catch (err: any) {
        console.error("❌ Network/Script Error:", err.message);
    }
}

testInsert();
