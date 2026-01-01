import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, Phone, Camera, Save, LogOut } from 'lucide-react';
import { User as UserType } from '../types';

interface MyProfileProps {
    user: any; // Auth User
}

const MyProfile: React.FC<MyProfileProps> = ({ user }) => {
    const [profile, setProfile] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    // const [address, setAddress] = useState('');
    const [photoURL, setPhotoURL] = useState('');

    useEffect(() => {
        if (user?.email) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users_public')
                .select('*')
                .eq('email', user.email)
                .single();

            if (error) throw error;

            if (data) {
                // Map DB to UserType
                const userProfile: UserType = {
                    uid: data.id,
                    email: data.email,
                    role: data.role as any,
                    name: data.name || '',
                    phone: data.phone || '',
                    address: data.address || '', // Assuming address field exists or ignored if not
                    photoURL: data.photo_url || '', // Assuming photo_url exists in DB or map from metadata
                    id: data.id,
                    employeeId: data.employee_id,
                    status: data.status as any
                };
                setProfile(userProfile);
                setName(userProfile.name || '');
                setPhone(userProfile.phone || '');
                // setAddress(userProfile.address || ''); // If not in DB, this will be empty, which is fine
                setPhotoURL(userProfile.photoURL || user.user_metadata?.avatar_url || '');
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            const updates = {
                name,
                phone,
                updated_at: new Date().toISOString()
                // Address might not be in users_public schema yet, so use with caution or add it
                // For now, removing address from DB update to be safe unless schema has it.
                // If MyProfile needs address, we assume it's there or user request mentions it.
                // Let's attempt update, if it fails due to column missing, Supabase errors.
                // Safe bet: Update Name and Phone which are standard.
            };

            const { error } = await supabase
                .from('users_public')
                .update(updates)
                .eq('id', profile.uid);

            if (error) throw error;

            alert("Profile Updated Successfully!");

            // Also update Auth Metadata if needed? Not strictly required if we rely on users_public.
        } catch (error: any) {
            console.error("Error updating profile:", error);
            alert("Update Failed: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        try {
            setSaving(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `avatars/${profile?.uid}/${fileName}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            // Update DB
            await supabase.from('users_public').update({ photo_url: publicUrl }).eq('id', profile?.uid);

            setPhotoURL(publicUrl);
            alert("Photo uploaded!");
        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Failed to upload image. (Ensure Storage Bucket 'avatars' exists)");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Profile...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 animate-fade-in">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                {/* Header Banner */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600"></div>

                <div className="px-8 pb-8">
                    <div className="flex justify-between items-end -mt-12 mb-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full border-4 border-gray-800 bg-gray-700 overflow-hidden">
                                {photoURL ? (
                                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-full h-full p-4 text-gray-400" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-500 border-2 border-gray-800">
                                <Camera size={14} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm font-bold bg-gray-900/50 px-3 py-1.5 rounded-lg border border-red-900/50 hover:border-red-500"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-1">{profile?.name || 'Unnamed User'}</h1>
                    <p className="text-blue-400 text-sm font-mono mb-6">{profile?.role} • {profile?.email}</p>

                    {/* Profile Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-gray-400 text-xs font-bold uppercase border-b border-gray-700 pb-2">Personal Info</h3>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Full Name</label>
                                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                                    <User size={16} className="text-gray-500" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="bg-transparent text-white w-full outline-none"
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Phone Number</label>
                                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                                    <Phone size={16} className="text-gray-500" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="bg-transparent text-white w-full outline-none"
                                        placeholder="+60..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-gray-400 text-xs font-bold uppercase border-b border-gray-700 pb-2">Employee Details</h3>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Employee ID</label>
                                <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed">
                                    {profile?.employeeId || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Status</label>
                                <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-green-400 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    {profile?.status || 'Active'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleUpdateProfile}
                            disabled={saving}
                            className={`bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;
