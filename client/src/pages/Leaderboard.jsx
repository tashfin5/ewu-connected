import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Trophy, Medal, User as UserIcon } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Leaderboard = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/leaderboard`);
        setLeaders(res.data);
      } catch (error) {
        console.error("Failed to load leaderboard");
      }
    };
    fetchLeaderboard();
  }, []);

  // 🚨 Gaming-Style Ranking System
  const getTier = (points) => {
    if (points >= 2500) return { name: 'Radiant', color: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-sm' };
    if (points >= 2000) return { name: 'Diamond', color: 'bg-cyan-100 text-cyan-700 border border-cyan-200' };
    if (points >= 1500) return { name: 'Platinum', color: 'bg-slate-200 text-slate-700 border border-slate-300' };
    if (points >= 1000) return { name: 'Gold', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
    if (points >= 500) return { name: 'Silver', color: 'bg-gray-100 text-gray-600 border border-gray-200' };
    return { name: 'Bronze', color: 'bg-orange-50 text-orange-700 border border-orange-200' };
  };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const renderPodiumStep = (user, rank) => {
    if (!user) return null;
    const tier = getTier(user.points);
    
    const heights = { 1: 'h-40', 2: 'h-28', 3: 'h-24' };
    const colors = { 1: 'bg-yellow-400', 2: 'bg-gray-300', 3: 'bg-orange-500' };
    const order = { 1: 'order-2 z-10', 2: 'order-1', 3: 'order-3' };

    return (
      <div key={user._id} className={`flex flex-col items-center ${order[rank]} mx-2`}>
        <div className={`flex flex-col items-center mb-4 ${rank === 1 ? '-mt-8' : ''}`}>
          <div className="relative">
            <div className={`w-20 h-20 rounded-full border-4 ${rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-300' : 'border-orange-500'} bg-white flex items-center justify-center shadow-lg overflow-hidden`}>
              {/* 🚨 Added Profile Picture Logic */}
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-gray-300" />
              )}
            </div>
            {rank === 1 && <Trophy className="absolute -bottom-2 -right-2 w-8 h-8 text-yellow-500 bg-white rounded-full p-1 shadow" />}
            {rank !== 1 && <Medal className={`absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full p-0.5 shadow ${rank === 2 ? 'text-gray-400' : 'text-orange-500'}`} />}
          </div>
          <h3 className="font-bold text-gray-900 mt-3 text-center">{user.name}</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest">{user.department || 'CSE'}</p>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 ${tier.color}`}>
            {tier.name}
          </span>
          <p className="font-black text-gray-800 mt-2">{user.points} <span className="text-[10px] text-gray-500 font-normal">PTS</span></p>
        </div>

        <div className={`w-24 md:w-32 rounded-t-lg shadow-inner flex justify-center items-start pt-4 text-4xl font-black text-white/50 ${heights[rank]} ${colors[rank]}`}>
          {rank}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" /> Leaderboard - Hall of Fame
          </h1>
          <p className="text-gray-500 mt-2">Top contributors and active learners</p>
        </div>

        {leaders.length > 0 ? (
          <div className="flex justify-center items-end mb-16 border-b-2 border-gray-100 pb-1">
            {renderPodiumStep(top3[1], 2)}
            {renderPodiumStep(top3[0], 1)}
            {renderPodiumStep(top3[2], 3)}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">Loading leaderboard data...</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Rankings</h2>
          </div>
          
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-2">Rank</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-2 text-center">Department</div>
            <div className="col-span-2 text-center">Tier</div>
            <div className="col-span-2 text-right">Points</div>
          </div>

          <div className="divide-y divide-gray-50">
            {rest.map((user, index) => {
              const currentRank = index + 4;
              const tier = getTier(user.points);
              const isMe = currentUser && currentUser._id === user._id;

              return (
                <div key={user._id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition hover:bg-gray-50 ${isMe ? 'bg-blue-50/50' : ''}`}>
                  <div className="col-span-2 font-bold text-gray-500">#{currentRank}</div>
                  
                  <div className="col-span-4 flex items-center gap-3">
                    {/* 🚨 Added Profile Picture Logic to list */}
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <span className={`font-bold ${isMe ? 'text-blue-700' : 'text-gray-900'}`}>{user.name}</span>
                      {isMe && <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">You</span>}
                    </div>
                  </div>

                  <div className="col-span-2 text-center text-sm font-medium text-gray-600">{user.department || 'CSE'}</div>
                  
                  <div className="col-span-2 flex justify-center">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${tier.color}`}>
                      <Medal className="w-3 h-3 opacity-80" /> {tier.name}
                    </span>
                  </div>
                  
                  <div className="col-span-2 text-right font-black text-gray-900">
                    {user.points.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;