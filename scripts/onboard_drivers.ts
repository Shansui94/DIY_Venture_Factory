
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DRIVERS = [
    { name: 'Dean', id: '8499' },
    { name: 'WAN', id: '2134' },
    { name: 'Ameer', id: '3190' },
    { name: 'Faizal', id: '1700' },
    { name: 'Waldan', id: '4766' },
    { name: 'Yashin', id: '1488' },
    { name: 'Alif', id: '3540' },
    { name: 'SAM', id: '6434' },
    { name: 'Mahadi', id: '1321' },
    { name: 'Tahir', id: '9524' },
    { name: 'Ayam', id: '6858' },
    { name: 'Bob', id: '6965' },
];

async function onboardDrivers() {
    console.log("🚀 STARTING DRIVER ONBOARDING...");
    console.log("----------------------------------------------------------------");
    console.log("| Name         | Login ID | Email (Auto-Gen)           | Password |");
    console.log("----------------------------------------------------------------");

    const results = [];

    for (const driver of DRIVERS) {
        // 1. Generate Creds
        const cleanName = driver.name.toLowerCase().replace(/\s/g, '');
        const email = `${cleanName}.${driver.id}@packsecure.com`;
        // Random 6 digit password
        const password = Math.floor(100000 + Math.random() * 900000).toString();

        try {
            // 2. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    full_name: driver.name,
                    employee_id: driver.id
                }
            });

            if (authError) {
                // If user already exists, we might want to just update the password or skip
                // For now, log error
                console.error(`Error creating ${driver.name}: ${authError.message}`);
                continue;
            }

            const uid = authData.user.id;

            // 3. Insert/Update Public Profile
            // createUser might wait for db trigger, but better to force upsert to ensure Role = Driver
            const { error: dbError } = await supabase.from('users_public').upsert({
                id: uid,
                email: email,
                name: driver.name,
                employee_id: driver.id,
                role: 'Driver',
                status: 'Active'
            });

            if (dbError) {
                console.error(`Error update profile ${driver.name}: ${dbError.message}`);
            } else {
                console.log(`| ${driver.name.padEnd(12)} | ${driver.id.padEnd(8)} | ${email.padEnd(26)} | ${password}   |`);
                results.push({ name: driver.name, id: driver.id, email, password });
            }

        } catch (e: any) {
            console.error(`Exception for ${driver.name}:`, e.message);
        }
    }
    console.log("----------------------------------------------------------------");
    console.log("✅ DONE. Copy the table above.");
}

onboardDrivers();
