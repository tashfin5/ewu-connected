import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import { motion } from 'framer-motion';
import { 
  Briefcase, TrendingUp, Book, Scale, 
  Users, Database, Heart, Pill, 
  BarChart, Calculator, Dna, Building2, 
  Zap, Radio, Code, Search, ChevronRight, Folder
} from 'lucide-react';

const departments = [
  { id: 'cse', name: 'CSE', fullName: 'Computer Science & Engineering', icon: Code, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800/50' },
  { id: 'bba', name: 'BBA', fullName: 'Bachelor of Business Administration', icon: Briefcase, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800/50' },
  { id: 'economics', name: 'Economics', fullName: 'Economics', icon: TrendingUp, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30 border-teal-100 dark:border-teal-800/50' },
  { id: 'english', name: 'English', fullName: 'English', icon: Book, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800/50' },
  { id: 'llb', name: 'LL.B', fullName: 'Bachelor of Laws', icon: Scale, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800/50' },
  { id: 'sociology', name: 'Sociology', fullName: 'Sociology', icon: Users, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800/50' },
  { id: 'is', name: 'Information Studies', fullName: 'Information Studies', icon: Database, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-100 dark:border-cyan-800/50' },
  { id: 'pphs', name: 'PPHS', fullName: 'Population & Public Health Sciences', icon: Heart, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800/50' },
  { id: 'pharmacy', name: 'Pharmacy', fullName: 'Bachelor of Pharmacy', icon: Pill, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/30 border-pink-100 dark:border-pink-800/50' },
  { id: 'dsa', name: 'DSA', fullName: 'Data Science & Analytics', icon: BarChart, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800/50' },
  { id: 'mathematics', name: 'Mathematics', fullName: 'Mathematics', icon: Calculator, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30 border-sky-100 dark:border-sky-800/50' },
  { id: 'geb', name: 'GEB', fullName: 'Genetic Engineering & Biotechnology', icon: Dna, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800/50' },
  { id: 'ce', name: 'CE', fullName: 'Civil Engineering', icon: Building2, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700' },
  { id: 'eee', name: 'EEE', fullName: 'Electrical & Electronic Engineering', icon: Zap, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800/50' },
  { id: 'ice', name: 'ICE', fullName: 'Information & Communication Engineering', icon: Radio, color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30 border-fuchsia-100 dark:border-fuchsia-800/50' },
];

const Repository = () => {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    dept.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
        
        {/* ================= MODERN HEADER ================= */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Smart Repository</h1>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 font-medium text-base max-w-xl">
              Access and contribute to EWU's largest collection of academic resources, past papers, and study materials.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search departments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
            />
          </div>
        </motion.div>

        {/* ================= DEPARTMENT GRID ================= */}
        {filteredDepartments.length > 0 ? (
          <motion.div 
            variants={containerVariants} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            {filteredDepartments.map((dept) => (
              <motion.div variants={itemVariants} key={dept.id}>
                <Link 
                  to={`/repository/${dept.id}`}
                  className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 p-6 flex flex-col relative group transition-all duration-300 hover:-translate-y-1.5 h-full"
                >
                  {/* Arrow Icon that appears on hover */}
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                    <ChevronRight className="w-5 h-5 text-blue-500" />
                  </div>

                  <div className={`w-14 h-14 ${dept.bg} border rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <dept.icon className={`w-7 h-7 ${dept.color}`} />
                  </div>
                  
                  <div className="mt-auto">
                    <h2 className="font-black text-slate-900 dark:text-white text-xl tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{dept.name}</h2>
                    <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-2 leading-relaxed line-clamp-2 pr-2">{dept.fullName}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
            className="text-center py-24 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm mt-8"
          >
            <div className="bg-slate-100 dark:bg-zinc-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-10 h-10 text-slate-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">No departments found</h3>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Try adjusting your search query.</p>
          </motion.div>
        )}

      </div>
    </Layout>
  );
};

export default Repository;