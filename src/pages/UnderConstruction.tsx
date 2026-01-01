import React from 'react';
import { Construction } from 'lucide-react';

const UnderConstruction: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in">
            <div className="bg-white/5 p-8 rounded-full mb-6 border border-white/10">
                <Construction size={64} className="text-yellow-500" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">{title}</h1>
            <p className="text-gray-500 max-w-md">
                This module is currently under active development.
                Please check back later or contact the administrator for access.
            </p>
        </div>
    );
};

export default UnderConstruction;
