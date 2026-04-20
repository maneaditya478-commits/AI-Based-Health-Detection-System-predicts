import React from 'react';
import { UserCircle } from 'lucide-react';

export const PatientProfile = ({ profile, onChangeProfile }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChangeProfile({
            ...profile,
            [name]: name === 'age' || name === 'comorbidity_index' || name === 'weight_kg' ? parseFloat(value) : value
        });
    };

    return (
        <div className="glass-card p-5 h-full flex flex-col relative overflow-hidden group border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                <UserCircle size={24} className="text-blue-400" />
                Patient Details
            </h3>

            <div className="space-y-4 flex-grow relative z-10 overflow-y-auto custom-scrollbar pr-2">

                {/* Name & ID Header */}
                <div className="flex gap-4">
                    <div className="flex-grow bg-gray-900/40 p-3 rounded-xl border border-white/5">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Patient Name</label>
                        <input
                            type="text"
                            name="name"
                            value={profile.name}
                            onChange={handleChange}
                            className="w-full bg-transparent text-lg font-bold text-white focus:outline-none focus:text-blue-400 transition-colors"
                        />
                    </div>
                </div>

                {/* Patient ID & Phone */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-900/40 p-3 rounded-xl border border-white/5">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Pt ID</label>
                        <input
                            type="text"
                            name="patient_id"
                            value={profile.patient_id}
                            onChange={handleChange}
                            className="w-full bg-transparent text-sm font-bold text-blue-400 focus:outline-none transition-colors"
                        />
                    </div>
                    <div className="bg-gray-900/40 p-3 rounded-xl border border-white/5">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Phone Number</label>
                        <input
                            type="text"
                            name="phone_number"
                            value={profile.phone_number}
                            onChange={handleChange}
                            placeholder="+91 XXXXX XXXXX"
                            className="w-full bg-transparent text-sm font-bold text-white focus:outline-none focus:text-blue-400 transition-colors"
                        />
                    </div>
                </div>

                {/* Demographics row 1 */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900/40 p-3 rounded-xl border border-white/5">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Age</label>
                        <input
                            type="number"
                            name="age"
                            min="0"
                            max="100"
                            value={profile.age}
                            onChange={handleChange}
                            className="w-full bg-transparent text-lg font-bold text-white focus:outline-none focus:text-blue-400 transition-colors"
                        />
                    </div>
                    <div className="bg-gray-900/40 p-3 rounded-xl border border-white/5">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Sex</label>
                        <select
                            name="gender"
                            value={profile.gender}
                            onChange={handleChange}
                            className="w-full bg-transparent text-lg font-bold text-white focus:outline-none focus:text-blue-400 appearance-none cursor-pointer"
                        >
                            <option value="M" className="bg-gray-800 text-sm">Male</option>
                            <option value="F" className="bg-gray-800 text-sm">Female</option>
                        </select>
                    </div>
                    <div className="bg-gray-900/40 p-3 rounded-xl border border-white/5 text-center">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Weight <span className='text-gray-500 lowercase'>kg</span></label>
                        <input
                            type="number"
                            name="weight_kg"
                            min="30"
                            max="300"
                            step="0.5"
                            value={profile.weight_kg}
                            onChange={handleChange}
                            className="w-full bg-transparent text-lg font-bold text-white focus:outline-none focus:text-blue-400 transition-colors text-center"
                        />
                    </div>
                </div>

                {/* Comorbidity */}
                <div className="bg-gray-900/40 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Comorbidity Index</label>
                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 rounded text-xs font-bold">{profile.comorbidity_index}</span>
                    </div>
                    <input
                        type="range"
                        name="comorbidity_index"
                        min="0"
                        max="10"
                        step="0.1"
                        value={profile.comorbidity_index}
                        onChange={handleChange}
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 mt-2"
                    />
                </div>
            </div>
        </div>
    );
};
