
import fetch from 'node-fetch';

async function trigger() {
    console.log("🤖 Simulating ESP32 Signal for T1.2-M01... (Targeting LAN IP)");
    try {
        // Test external accessibility via LAN IP
        const res = await fetch('http://192.168.1.228:8080/api/alarm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                machine_id: 'T1.2-M01',
                alarm_count: 2
            })
        });

        if (res.ok) {
            const data = await res.json();
            console.log("✅ Server Accepted:", data);
            console.log("\n👀 Watch your dashboard! The count should have increased by 2.");
        } else {
            const text = await res.text();
            console.error("❌ Server Error:", res.status, text);
        }

    } catch (e: any) {
        console.error("❌ Failed to connect:", e.message);
        console.log("Is your server running on port 8080?");
    }
}
trigger();
