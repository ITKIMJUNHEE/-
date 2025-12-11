import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TramMap from './components/TramMap';
import { runSimulation } from './engine/simulationLogic';
import { fetchAllData } from './utils/dataLoader';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, AlertTriangle, Settings, BarChart3, ArrowRight } from 'lucide-react';

const MainDashboard = () => {
  const navigate = useNavigate();
  const [params, setParams] = useState({ tramInterval: 10, busReduction: 10 });
  const [results, setResults] = useState(null);
  const [data, setData] = useState({ tram: [], bus: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const loadedData = await fetchAllData();
      setData(loadedData);
      setResults(runSimulation(10, 10, loadedData.tram));
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading && data.tram.length > 0) {
      setResults(runSimulation(params.tramInterval, params.busReduction, data.tram));
    }
  }, [params, loading, data]);

  if (loading) return <div className="flex h-screen w-screen items-center justify-center bg-white text-blue-600 font-bold text-xl">데이터 분석 중...</div>;

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans text-slate-800 select-none bg-slate-50">
      
      {/* 1. 배경 지도 */}
      <TramMap simulationResult={results} busStops={data.bus} />

      {/* 2. 타이틀 헤더 (수정됨: 트램 ON) */}
      <header className="absolute top-0 left-0 w-full p-6 z-50 pointer-events-none bg-gradient-to-b from-white/90 to-transparent flex justify-between items-start">
        <div>
          {/* ⭐ 이름 변경: OASIS -> 트램 ON ⭐ */}
          <h1 className="text-4xl font-black tracking-tighter text-blue-900 drop-shadow-sm">
            트램 ON
          </h1>
          <p className="text-slate-500 font-bold tracking-widest text-sm mt-1">
            DAEJEON TRAM OPTIMIZATION SYSTEM
          </p>
        </div>
        
        <div className="pointer-events-auto flex items-center gap-4">
          <div className="font-mono text-xs text-slate-400 bg-white/50 px-3 py-1 rounded-full hidden md:block">
            <p>DATA: 2025.12.08 LIVE</p>
          </div>
          <button 
            onClick={() => navigate('/simulation')}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
          >
            상세 시뮬레이터 <ArrowRight size={18} />
          </button>
        </div>
      </header>

      {/* 3. 왼쪽 컨트롤 패널 */}
      <aside className="absolute bottom-10 left-10 w-96 bg-white/80 backdrop-blur-xl rounded-3xl p-8 z-50 shadow-2xl border border-white/50 hidden md:block">
        <div className="flex items-center gap-2 mb-8 text-blue-700">
          <Settings className="w-5 h-5" />
          <h2 className="font-bold text-lg tracking-wide">정책 변수 설정</h2>
        </div>

        <div className="mb-8 group">
          <div className="flex justify-between mb-3 text-sm font-bold text-slate-700">
            <span>트램 배차 간격</span>
            <span className="text-blue-600 font-mono text-lg">{params.tramInterval}분</span>
          </div>
          <input
            type="range" min="3" max="15" step="1" value={params.tramInterval}
            onChange={(e) => setParams({...params, tramInterval: Number(e.target.value)})}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
          />
        </div>

        <div className="mb-4 group">
          <div className="flex justify-between mb-3 text-sm font-bold text-slate-700">
            <span>버스 노선 감축률</span>
            <span className="text-red-500 font-mono text-lg">{params.busReduction}%</span>
          </div>
          <input
            type="range" min="0" max="50" step="5" value={params.busReduction}
            onChange={(e) => setParams({...params, busReduction: Number(e.target.value)})}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400 transition-all"
          />
        </div>
      </aside>

      {/* 4. 오른쪽 분석 패널 */}
      <aside className="absolute top-28 right-10 w-[400px] space-y-4 z-50 hidden md:block">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border-l-4 border-blue-600">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 text-sm font-bold">연간 운영 예산</span>
            <Zap className="text-blue-600 w-5 h-5" />
          </div>
          <p className="text-4xl font-black text-slate-800">
            {results?.budget.toLocaleString()} <span className="text-lg font-normal text-slate-400">억원</span>
          </p>
          <div className="text-xs text-blue-600 mt-2 font-bold">
             변동액: {(15-params.tramInterval)*200 - params.busReduction*100}억 원
          </div>
        </div>

        <div className={`bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border-l-4 transition-colors duration-300 ${results?.congestion > 100 ? 'border-red-500' : 'border-emerald-500'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 text-sm font-bold">평균 혼잡도 / 위험도</span>
            <AlertTriangle className={`w-5 h-5 ${results?.congestion > 100 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
          </div>
          <div className="flex items-end gap-3">
             <p className={`text-4xl font-black ${results?.congestion > 100 ? 'text-red-600' : 'text-slate-800'}`}>
               {results?.congestion}%
             </p>
             <span className={`text-sm font-bold px-2 py-1 rounded mb-1 ${results?.complaintRisk === '심각' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
               {results?.complaintRisk} 단계
             </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 font-medium">💡 {results?.complaintMsg}</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
           <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm font-bold">
             <BarChart3 className="w-4 h-4" /> 시간대별 혼잡도 예측
           </div>
           <div className="h-40 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={results?.chartData}>
                 <defs>
                   <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <XAxis dataKey="time" stroke="#94a3b8" tick={{fontSize: 12}} />
                 <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b'}} />
                 <Area type="monotone" dataKey="val" stroke="#2563eb" fillOpacity={1} fill="url(#colorVal)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      </aside>
    </div>
  );
};

export default MainDashboard;