import { motion } from 'framer-motion';
import { Smartphone, Monitor, ChevronRight, Download, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

import step1 from '../assets/step1.jpeg';
import step2 from '../assets/step2.jpeg';
import step3 from '../assets/step3.jpeg';
import Layout from '../components/Layout';

const Downloads = () => {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-24">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 pt-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
            Take <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">EWU ConnectED</span> Everywhere
          </h1>
          <p className="text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
            Download our dedicated native applications for the best experience. Stay connected to your academic ecosystem, faster and smoother.
          </p>
        </motion.div>

        {/* Download Buttons Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {/* Windows Download */}
          <motion.a
            href="https://github.com/tashfin5/ewu-connected/releases/latest/download/EWU.ConnectED.Setup.exe"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="group flex flex-col items-center justify-center p-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Monitor className="w-20 h-20 text-slate-900 dark:text-white mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Download for Windows</h2>
            <p className="text-slate-500 dark:text-zinc-400 text-center mb-6 relative z-10 font-medium">Full desktop experience, lightning fast performance, and native notifications.</p>
            <div className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl relative z-10 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 dark:group-hover:text-white transition-colors">
              <Download className="w-5 h-5" />
              Download .exe
            </div>
          </motion.a>

          {/* Android Download */}
          <motion.a
            href="https://github.com/tashfin5/ewu-connected/releases/latest/download/EWU.ConnectED.apk"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="group flex flex-col items-center justify-center p-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-emerald-500 dark:hover:border-emerald-500 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Smartphone className="w-20 h-20 text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Download for Android</h2>
            <p className="text-slate-500 dark:text-zinc-400 text-center mb-6 relative z-10 font-medium">Your entire academic life, right in your pocket. Smooth and highly responsive.</p>
            <div className="flex items-center gap-2 px-6 py-3 bg-emerald-600 dark:bg-emerald-500 text-white font-bold rounded-xl relative z-10 group-hover:bg-emerald-700 dark:group-hover:bg-emerald-400 transition-colors">
              <Download className="w-5 h-5" />
              Download .apk
            </div>
          </motion.a>
        </div>

        {/* Android Installation Guide */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none"
        >
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-zinc-800 pb-6">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl">
              <Smartphone className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Android Installation Guide</h2>
              <p className="text-slate-500 dark:text-zinc-400 font-medium">How to safely install the APK on your device</p>
            </div>
          </div>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-bold">
                  Step 1
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Allow Unknown Apps</h3>
                <p className="text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                  After downloading the <span className="text-emerald-600 dark:text-emerald-400 font-bold">.apk</span> file, open it. 
                  Your phone might block the installation by default for security. 
                  Tap <span className="text-slate-900 dark:text-white font-bold">Settings</span> on the prompt, and toggle <span className="text-slate-900 dark:text-white font-bold">Allow from this source</span> to enabled.
                </p>
              </div>
              <div className="w-full md:w-64 rounded-2xl overflow-hidden shadow-xl border-4 border-slate-100 dark:border-zinc-800">
                <img src={step1} alt="Allow unknown apps" className="w-full h-auto object-cover" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-bold">
                  Step 2
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Install the Application</h3>
                <p className="text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                  Once permission is granted, press the back button and tap <span className="text-slate-900 dark:text-white font-bold">Install</span>. 
                  The app will begin installing natively onto your Android device.
                </p>
              </div>
              <div className="w-full md:w-64 rounded-2xl overflow-hidden shadow-xl border-4 border-slate-100 dark:border-zinc-800">
                <img src={step2} alt="Install button" className="w-full h-auto object-cover" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-bold">
                  Step 3
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bypass Play Protect Warning</h3>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                  <p className="text-amber-800 dark:text-amber-400 text-sm font-medium">
                    Because this app is not on the Google Play Store, Play Protect will show a warning. This is normal for side-loaded apps!
                  </p>
                </div>
                <p className="text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                  On the Unsafe app blocked screen, tap <span className="text-slate-900 dark:text-white font-bold">More details</span> at the bottom, 
                  then select <span className="text-emerald-600 dark:text-emerald-400 font-bold">Install anyway</span> to finish the installation.
                </p>
                <div className="flex items-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 py-2 px-4 rounded-lg inline-flex">
                  <ShieldCheck className="w-5 h-5" /> 100% Safe & Open Source
                </div>
              </div>
              <div className="w-full md:w-64 rounded-2xl overflow-hidden shadow-xl border-4 border-slate-100 dark:border-zinc-800">
                <img src={step3} alt="Play protect warning" className="w-full h-auto object-cover" />
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Downloads;
