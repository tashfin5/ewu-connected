import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, User as UserIcon, Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Leaderboard = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/leaderboard`);
        setLeaders(res.data);
      } catch (error) {
        console.error("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Gaming-Style Ranking System
  const getTier = (points) => {
    if (points >= 5000) return { name: 'Radiant', bg: 'bg-gradient-to-r from-fuchsia-500 to-purple-600', text: 'text-white', border: 'border-fuchsia-400', glow: 'shadow-[0_0_15px_rgba(217,70,239,0.5)]' };
    if (points >= 4000) return { name: 'Diamond', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800', glow: '' };
    if (points >= 3000) return { name: 'Platinum', bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700', glow: '' };
    if (points >= 2000) return { name: 'Gold', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800/50', glow: '' };
    if (points >= 1000) return { name: 'Silver', bg: 'bg-gray-100 dark:bg-zinc-800', text: 'text-gray-600 dark:text-zinc-400', border: 'border-gray-200 dark:border-zinc-700', glow: '' };
    return { name: 'Bronze', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-900/50', glow: '' };
  };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const renderPodiumStep = (user, rank) => {
    if (!user) return null;
    const tier = getTier(user.points);
    
    const heights = { 1: 'h-48 md:h-56', 2: 'h-36 md:h-44', 3: 'h-28 md:h-36' };
    const colors = { 
      1: 'bg-gradient-to-t from-yellow-500/20 to-yellow-400 border-t-4 border-yellow-300', 
      2: 'bg-gradient-to-t from-slate-400/20 to-slate-300 border-t-4 border-slate-200', 
      3: 'bg-gradient-to-t from-orange-500/20 to-orange-400 border-t-4 border-orange-300' 
    };
    const darkColors = {
      1: 'dark:from-yellow-900/40 dark:to-yellow-600/40 dark:border-yellow-500', 
      2: 'dark:from-slate-800/40 dark:to-slate-600/40 dark:border-slate-500', 
      3: 'dark:from-orange-900/40 dark:to-orange-700/40 dark:border-orange-500'
    };
    const order = { 1: 'order-2 z-20', 2: 'order-1 z-10', 3: 'order-3 z-10' };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.1, type: 'spring' }}
        key={user._id} className={`flex flex-col items-center ${order[rank]} mx-1 md:mx-3 relative`}
      >
        <div className={`flex flex-col items-center mb-6 relative z-10 ${rank === 1 ? '-mt-12' : ''}`}>
          {rank === 1 && (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -inset-8 bg-yellow-400/20 rounded-full blur-2xl -z-10"></motion.div>
          )}
          
          <div className="relative group">
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-[4px] ${rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-slate-300' : 'border-orange-500'} bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xl overflow-hidden transform transition-transform group-hover:scale-105`}>
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-slate-300 dark:text-zinc-600" />
              )}
            </div>
            {rank === 1 && (
              <div className="absolute -bottom-3 -right-3 bg-white dark:bg-zinc-800 rounded-full p-1.5 shadow-lg border border-yellow-100 dark:border-yellow-900/50">
                <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-sm" />
              </div>
            )}
            {rank !== 1 && (
              <div className="absolute -bottom-2 -right-2 bg-white dark:bg-zinc-800 rounded-full p-1 shadow-md border border-slate-100 dark:border-zinc-700">
                <Medal className={`w-6 h-6 ${rank === 2 ? 'text-slate-400' : 'text-orange-500'}`} />
              </div>
            )}
          </div>
          
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg mt-5 flex flex-col items-center border border-slate-200/50 dark:border-zinc-800/50">
            <h3 className="font-black text-slate-900 dark:text-white text-center whitespace-nowrap text-sm md:text-base">{user.name.split(' ')[0]}</h3>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1.5 border ${tier.bg} ${tier.text} ${tier.border} ${tier.glow}`}>
              {tier.name}
            </span>
            <p className="font-black text-slate-800 dark:text-slate-200 mt-1.5 text-sm md:text-base">{user.points.toLocaleString()} <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase">PTS</span></p>
          </div>
        </div>

        <div className={`w-28 md:w-36 rounded-t-[2rem] shadow-2xl flex justify-center items-start pt-6 text-5xl md:text-6xl font-black text-white/50 dark:text-white/20 backdrop-blur-sm ${heights[rank]} ${colors[rank]} ${darkColors[rank]}`}>
          {rank}
        </div>
      </motion.div>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans">
        
        {/* ================= HEADER ================= */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-black tracking-widest uppercase mb-4 border border-yellow-200 dark:border-yellow-800/50 shadow-sm">
            <Sparkles className="w-4 h-4" /> Global Rankings
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-4 tracking-tight leading-tight">
            Hall of Fame
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-4 font-medium text-lg max-w-2xl mx-auto">Top contributors shaping the academic community through shared knowledge and active participation.</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-32">
             <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
          </div>
        ) : leaders.length > 0 ? (
          <>
            {/* ================= PODIUM ================= */}
            <div className="flex justify-center items-end mb-12 md:mb-16 pt-12">
              {renderPodiumStep(top3[1], 2)}
              {renderPodiumStep(top3[0], 1)}
              {renderPodiumStep(top3[2], 3)}
            </div>

            {/* ================= RANKINGS LIST ================= */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Community Rankings</h2>
              </div>
              
              <div className="grid grid-cols-12 gap-4 px-6 md:px-8 py-4 bg-slate-50/50 dark:bg-[#0a0a0a]/50 text-[10px] md:text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest border-b border-slate-100 dark:border-zinc-800">
                <div className="col-span-2 md:col-span-1 text-center">Rank</div>
                <div className="col-span-6 md:col-span-5">Learner</div>
                <div className="col-span-4 md:col-span-4 text-center">Current Tier</div>
                <div className="col-span-hidden md:col-span-2 text-right hidden md:block">Score</div>
              </div>

              <motion.div variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-slate-50 dark:divide-zinc-800/50">
                {rest.map((user, index) => {
                  const currentRank = index + 4;
                  const tier = getTier(user.points);
                  const isMe = currentUser && currentUser._id === user._id;

                  return (
                    <motion.div variants={itemVariants} key={user._id} className={`grid grid-cols-12 gap-4 px-6 md:px-8 py-5 items-center transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50 ${isMe ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                      
                      <div className="col-span-2 md:col-span-1 font-black text-slate-400 dark:text-zinc-500 text-center text-lg">
                        #{currentRank}
                      </div>
                      
                      <div className="col-span-6 md:col-span-5 flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-slate-200 dark:border-zinc-700 shadow-sm overflow-hidden shrink-0">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold truncate block ${isMe ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>{user.name}</span>
                            {isMe && <span className="shrink-0 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                          </div>
                          <span className="md:hidden block text-xs font-black text-slate-500 mt-0.5">{user.points.toLocaleString()} PTS</span>
                        </div>
                      </div>
                      
                      <div className="col-span-4 md:col-span-4 flex justify-center">
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${tier.bg} ${tier.text} ${tier.border}`}>
                          <Medal className="w-3.5 h-3.5 opacity-80" /> <span className="hidden sm:inline">{tier.name}</span>
                        </span>
                      </div>
                      
                      <div className="col-span-hidden md:col-span-2 text-right font-black text-slate-900 dark:text-white text-lg hidden md:block">
                        {user.points.toLocaleString()}
                      </div>
                      
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </>
        ) : (
          <div className="text-center py-20 text-slate-400 dark:text-zinc-500 font-medium">No leaderboard data available yet.</div>
        )}
      </div>
    </Layout>
  );
};

export default Leaderboard;