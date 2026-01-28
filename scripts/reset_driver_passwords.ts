
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load Environment Variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must be Service Role

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const drivers = [
    { name: 'Dean', id: '8499', email: 'dean.8499@packsecure.com', pass: '852655' },
    { name: 'WAN', id: '2134', email: 'wan.2134@packsecure.com', pass: '106923' },
    { name: 'Ameer', id: '3190', email: 'ameer.3190@packsecure.com', pass: '910382' },
    { name: 'Faizal', id: '1700', email: 'faizal.1700@packsecure.com', pass: '741028' },
    { name: 'Waldan', id: '4766', email: 'waldan.4766@packsecure.com', pass: '283910' },
    { name: 'Yashin', id: '1488', email: 'yashin.1488@packsecure.com', pass: '592837' },
    { name: 'Alif', id: '3540', email: 'alif.3540@packsecure.com', pass: '492810' },
    { name: 'SAM', id: '6434', email: 'sam.6434@packsecure.com', pass: '827391' },
    { name: 'Mahadi', id: '1321', email: 'mahadi.1321@packsecure.com', pass: '572910' },
    { name: 'Tahir', id: '9524', email: 'tahir.9524@packsecure.com', pass: '482910' },
    { name: 'Ayam', id: '6858', email: 'ayam.6858@packsecure.com', pass: '582910' },
    { name: 'Bob', id: '6965', email: 'bob.6965@packsecure.com', pass: '382918' }
];

async function resetPasswords() {
    console.log(`🔒 Resetting passwords for ${drivers.length} drivers...`);

    for (const d of drivers) {
        try {
            console.log(`Processing ${d.name} (${d.email})...`);

            // 1. Check if user exists by ID (employee_id check logic usually done by query, but here we query auth)
            // Ideally we query users_public to get UID, or just try to get user by email from Auth Admin

            // ADMIN: Get User by Email
            const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
            if (searchError) throw searchError;

            const user = users.find(u => u.email?.toLowerCase() === d.email.toLowerCase());

            if (user) {
                // UPDATE PASSWORD
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    user.id,
                    { password: d.pass }
                );

                if (updateError) {
                    console.error(`❌ Failed to update ${d.name}:`, updateError.message);
                } else {
                    console.log(`✅ Updated password for ${d.name}`);
                }
            } else {
                // CREATE USER IF NOT EXISTS
                console.log(`⚠️ User not found. Creating ${d.name}...`);
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: d.email,
                    password: d.pass,
                    email_confirm: true,
                    user_metadata: {
                        name: d.name,
                        role: 'Driver',
                        employee_id: d.id
                    }
                });
                if (createError) {
                    console.error(`❌ Failed to create ${d.name}:`, createError.message);
                } else {
                    console.log(`✅ Created user ${d.name}`);

                    // Upsert into users_public manually if trigger fails/doesn't exist (safety)
                    if (newUser.user) {
                        const { error: dbError } = await supabaseAdmin
                            .from('users_public')
                            .upsert({
                                id: newUser.user.id,
                                email: d.email,
                                name: d.name,
                                role: 'Driver',
                                employee_id: d.id,
                                last_seen: new Date().toISOString()
                            });
                        if (dbError) console.error(`   ⚠️ DB Sync error: ${dbError.message}`);
                    }
                }
            }

        } catch (err: any) {
            console.error(`❌ Error processing ${d.name}:`, err.message);
        }
    }
    console.log("\n✨ Password Reset Complete.");
}

resetPasswords();
