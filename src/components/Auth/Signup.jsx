import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Signup = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        avatarColor: '#3b82f6'
    });
    const [error, setError] = useState('');
    const { signup } = useAuth();
    const navigate = useNavigate();

    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#f43f5e", "#06b6d4"];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        try {
            await signup(formData);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 bg-[url('/music_player_bg.png')] bg-cover bg-center">
            <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent italic tracking-tighter">
                        Join StreamVibe
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Create your premium account</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold py-3 px-4 rounded-xl text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Username</label>
                        <input
                            type="text"
                            name="username"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-bold placeholder-slate-700 transition-all text-sm"
                            placeholder="dj_master"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-bold placeholder-slate-700 transition-all text-sm"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Your Color</label>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, avatarColor: c })}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${formData.avatarColor === c ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                                    style={{ backgroundColor: c }}
                                ></button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-bold placeholder-slate-700 transition-all text-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-bold placeholder-slate-700 transition-all text-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-xl shadow-xl transform transition hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wide text-sm mt-4"
                    >
                        Create Account 🚀
                    </button>
                </form>

                <p className="text-center text-slate-500 text-xs font-bold">
                    Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
