import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  Briefcase, TrendingUp, Book, Scale, 
  Users, Database, Heart, Pill, 
  BarChart, Calculator, Dna, Building2, 
  Zap, Radio, Code, Search, ChevronRight
} from 'lucide-react';

const Repository = () => {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');

  const departments = [
    { id: 'cse', name: 'CSE', fullName: 'Computer Science & Engineering', icon: Code, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'bba', name: 'BBA', fullName: 'Bachelor of Business Administration', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'economics', name: 'Economics', fullName: 'Economics', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'english', name: 'English', fullName: 'English', icon: Book, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'llb', name: 'LL.B', fullName: 'Bachelor of Laws', icon: Scale, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'sociology', name: 'Sociology', fullName: 'Sociology', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'is', name: 'Information Studies', fullName: 'Information Studies', icon: Database, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'pphs', name: 'PPHS', fullName: 'Population & Public Health Sciences', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'pharmacy', name: 'Pharmacy', fullName: 'Bachelor of Pharmacy', icon: Pill, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'dsa', name: 'DSA', fullName: 'Data Science & Analytics', icon: BarChart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'mathematics', name: 'Mathematics', fullName: 'Mathematics', icon: Calculator, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'geb', name: 'GEB', fullName: 'Genetic Engineering & Biotechnology', icon: Dna, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'ce', name: 'CE', fullName: 'Civil Engineering', icon: Building2, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'eee', name: 'EEE', fullName: 'Electrical & Electronic Engineering', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { id: 'ice', name: 'ICE', fullName: 'Information & Communication Engineering', icon: Radio, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
  ];

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    dept.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans">
        
        {/* ================= MODERN HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Smart Repository</h1>
            </div>
            <p className="text-gray-500 font-medium text-sm md:text-base max-w-xl">
              Access and contribute to EWU's largest collection of academic resources, past papers, and study materials.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search departments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* ================= DEPARTMENT GRID ================= */}
        {filteredDepartments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredDepartments.map((dept) => (
              <Link 
                key={dept.id} 
                to={`/repository/${dept.id}`}
                className="bg-white rounded-[2rem] border-2 border-transparent shadow-sm hover:shadow-lg p-6 flex flex-col relative group transition-all duration-300 hover:-translate-y-1 hover:border-blue-100"
              >
                {/* Arrow Icon that appears on hover */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                  <ChevronRight className="w-5 h-5 text-blue-500" />
                </div>

                <div className={`w-16 h-16 ${dept.bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <dept.icon className={`w-8 h-8 ${dept.color}`} />
                </div>
                
                <div className="mt-auto">
                  <h2 className="font-black text-gray-900 text-xl tracking-tight group-hover:text-blue-600 transition-colors">{dept.name}</h2>
                  <p className="text-xs font-bold text-gray-400 mt-1 leading-snug line-clamp-2 pr-4">{dept.fullName}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm mt-8">
            <h3 className="text-xl font-bold text-gray-900">No departments found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search query.</p>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Repository;