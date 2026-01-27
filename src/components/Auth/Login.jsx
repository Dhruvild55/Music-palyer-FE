import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 bg-[url('/music_player_bg.png')] bg-cover bg-center">
            <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent italic tracking-tighter">
                        Welcome Back
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Log in to your stage</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold py-3 px-4 rounded-xl text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white font-bold placeholder-slate-700 transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white font-bold placeholder-slate-700 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-xl transform transition hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wide mt-2"
                    >
                        Login to Vibes ⚡
                    </button>
                </form>

                <p className="text-center text-slate-500 text-xs font-bold">
                    New to StreamVibe? <Link to="/signup" className="text-purple-400 hover:text-purple-300">Sign Up</Link>
                </p>

                <div className="text-center">
                    <Link to="/" className="text-[10px] text-slate-600 uppercase font-black hover:text-slate-400 transition-colors">Continue as Guest</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
