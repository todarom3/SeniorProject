import React from 'react';

const Box = ({ title, subtitle }) => (
  <div className="relative group p-6 rounded-2xl border border-blue-400 bg-blue-600 shadow-[0_10px_30px_rgba(37,99,235,0.4)] text-white transition-all duration-300 min-w-[280px] text-center z-10">
    <div className="text-lg font-black tracking-wide uppercase italic">{title}</div>
    {subtitle && (
      <div className="text-sm mt-2 font-medium text-blue-100 opacity-90 leading-snug">
        {subtitle}
      </div>
    )}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
  </div>
);

const DottedLine = ({ height = 60 }) => (
  <svg width="2" height={height} className="overflow-visible">
    <line 
      x1="1" y1="0" x2="1" y2={height} 
      stroke="#60a5fa" 
      strokeWidth="2" 
      strokeDasharray="6 4" 
    />
    <path d={`M-4 ${height-8} L1 ${height} L6 ${height-8}`} fill="none" stroke="#60a5fa" strokeWidth="2" />
  </svg>
);

export default function FraudSystemDiagram() {
  return (
    <div className="p-12 bg-[#020617] min-h-screen font-sans flex flex-col items-center justify-center relative">
      {/* Glow Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full flex flex-col items-center">
        {/* Updated Header with New Line */}
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2 italic uppercase leading-none">
            Fraud Detection
          </h1>
          <h2 className="text-4xl font-bold text-blue-500 tracking-tight uppercase italic opacity-80">
            System Diagram
          </h2>
          <div className="h-1.5 w-32 bg-blue-600 mx-auto mt-6 rounded-full shadow-[0_0_15px_#2563eb]" />
        </header>

        {/* Start */}
        <Box title="User" subtitle="Chooses data source" />
        <DottedLine />

        {/* Ingestion Split - Now specifying Credit Card Transactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
          <Box 
            title="Synthetic Transaction Generator" 
            subtitle="Java • Creates realistic Credit Card fraud-pattern CSVs" 
          />
          <Box 
            title="User CSV Upload" 
            subtitle="External Credit Card transaction files" 
          />
          
          <svg className="absolute -bottom-16 left-1/2 -translate-x-1/2 hidden md:block" width="440" height="80">
            <path 
              d="M20 0 C20 40, 200 40, 220 80 M420 0 C420 40, 240 40, 220 80" 
              stroke="#60a5fa" 
              fill="none" 
              strokeWidth="2" 
              strokeDasharray="6 4" 
            />
          </svg>
        </div>

        {/* Vertical Flow */}
        <div className="mt-16 flex flex-col items-center">
          <Box title="Dashboard / Frontend" subtitle="Upload, controls, visualizations" />
          <DottedLine />
          
          <Box title="API Layer" subtitle="Connects dashboard to ML pipeline" />
          <DottedLine />
          
          <Box title="ML Fraud Detection Model" subtitle="Python model predicts suspicious transactions" />
          <DottedLine />
          
          <Box title="Results Visualization (Inside Dashboard)" subtitle="Predicted fraud results, charts, visualizations, summaries" />
        </div>

        {/* Persistence Section */}
        <div className="mt-20 flex flex-col items-center">
          <div className="relative p-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mb-1 w-full" />
          <div className="flex flex-col md:flex-row items-center gap-8 bg-blue-950/20 p-10 rounded-[3rem] border border-blue-500/20 backdrop-blur-sm">
            <Box 
                title="Database Storage" 
                subtitle="Stores uploaded and generated Credit Card data" 
            />
            
            <div className="flex items-center">
              <svg width="60" height="20" className="hidden md:block">
                <line x1="0" y1="10" x2="50" y2="10" stroke="#60a5fa" strokeWidth="2" strokeDasharray="6 4" />
                <path d="M42 5 L50 10 L42 15" fill="none" stroke="#60a5fa" strokeWidth="2" />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest text-blue-400 border border-blue-500/30 px-4 py-2 rounded-full bg-blue-500/5">
                Optional side storage path
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
