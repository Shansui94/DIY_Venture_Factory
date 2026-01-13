
import fetch from 'node-fetch';

async function testVercel() {
    const url = 'https://packsecure.vercel.app/api/alarm';
    console.log(`🚀 Testing Vercel API: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                machine_id: 'DEBUG-TESTER',
                alarm_count: 1
            })
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

        if (response.status === 200) {
            console.log("✅ Vercel API is WORKING!");
        } else {
            console.log("❌ Vercel API Failed. Likely missing Env Vars in Vercel Dashboard.");
        }

    } catch (e) {
        console.error("❌ Network/DNS Error:", e);
    }
}

testVercel();
