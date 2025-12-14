import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import TramMap from './components/TramMap'; 
import { 
  Zap, AlertTriangle, ArrowRight, Sun, CloudRain, Snowflake, LogOut, Siren, 
  Map as MapIcon, Users, MessageSquare, CheckCircle, Phone, ShieldAlert, 
  Wrench, Send, Cloud, Thermometer, Megaphone, Bus, Calendar, Clock, 
  Activity, BarChart3, Radio, Droplets, Leaf, Cpu, Gauge, FileText, Download, X
} from 'lucide-react';

const RAW_CSV_DATA = `station_id,station_name,lat,lon,transfer_type,base_passengers,is_shared
201,서대전역,36.3218,127.4042,Train,600,False
202,서대전네거리,36.3225,127.4038,Subway,1200,True
203,대사,36.3195,127.4110,,300,False
204,대흥(한화이글스파크),36.3182,127.4195,,800,True
205,인동,36.3220,127.4285,,400,False
206,대전역(중앙시장),36.3315,127.4325,Subway,1500,True
207,대전역(동광장),36.3330,127.4355,Train,900,False
208,대동,36.3338,127.4435,Subway,700,False
209,자양(우송대),36.3385,127.4485,,600,True
210,가양,36.3450,127.4460,,500,False
211,동부(복합터미널),36.3505,127.4410,Bus,1300,True
212,중리,36.3580,127.4305,,450,False
213,한남대,36.3630,127.4205,,550,True
214,오정,36.3675,127.4120,Train,300,False
215,농수산물시장,36.3685,127.4010,,250,True
216,둔산(재뜰네거리),36.3650,127.3915,,600,False
217,샘머리공원,36.3610,127.3855,,400,False
218,정부청사,36.3578,127.3814,Subway,1100,False
219,월평,36.3550,127.3750,,500,False
220,만년,36.3600,127.3710,,300,False
221,엑스포과학공원,36.3750,127.3850,,900,True
222,KAIST,36.3725,127.3600,,700,False
223,유성구청,36.3630,127.3570,,400,True
224,충남대,36.3605,127.3480,,1200,True
225,유성온천,36.3538,127.3414,Subway,1400,True
226,상대,36.3450,127.3380,,350,False
227,원골,36.3390,127.3350,,300,False
228,시립박물관,36.3320,127.3310,,250,False
229,목원대,36.3300,127.3350,,600,False
230,용계,36.3350,127.3395,,500,False
231,대정,36.3250,127.3500,,600,False
232,원앙,36.3180,127.3500,,650,False
233,관저4,36.3100,127.3500,,700,False
234,관저,36.3100,127.3650,,800,True
235,가수원,36.3100,127.3800,,900,True
236,정림,36.3100,127.3900,,850,False
237,복수,36.3120,127.4000,,750,False
238,도마,36.3150,127.3920,,900,True
239,유천,36.3180,127.3980,,950,True
240,유천4,36.3200,127.4010,,700,False
241,법동,36.3620,127.4320,,800,False
242,동부여성가족원,36.3650,127.4330,,600,False
243,읍내,36.3680,127.4340,,700,False
244,연축,36.3811,127.4402,,600,False
245,진잠,36.3100,127.3350,,650,False`;

const ACCIDENT_SCENARIOS = [
    { type: '추돌 사고', title: "⚠️ 3중 추돌 사고 발생", desc: "차량 통제 및 정체 극심. 우회 경로 안내 필요.", action: "police", stId: 202 },
    { type: '차량 고장', title: "🚋 수소 연료 스택 이상", desc: "전압 불안정 감지. 예비 전력 전환 및 점검 요망.", action: "tech", stId: 225 },
    { type: '화재 감지', title: "🔥 선로 주변 화재 발생", desc: "연기 유입 우려. 해당 구간 운행 일시 중단.", action: "fire", stId: 211 },
    { type: '선로 침수', title: "💧 집중 호우로 인한 침수", desc: "갑천 수위 상승. 서행 운전 및 배수 작업 필요.", action: "tech", stId: 221 },
];

const COMPLAINT_POOL = [
    { type: 'TEMP', msg: "에어컨 온도가 너무 높아요 💦" },
    { type: 'DELAY', msg: "배차 간격이 너무 깁니다! 20분째 대기중..." },
    { type: 'CROWD', msg: "사람이 너무 많아서 못 타겠어요. 숨막혀요." },
    { type: 'CLEAN', msg: "좌석에 음료가 쏟아져 있어요. 끈적거립니다." }
];

const AI_LOGS = [
    "실시간 평균 운행 속도 분석 중... (Target: 19.82km/h)",
    "구간별 혼잡도 예측 모델링 업데이트 완료",
    "수소 연료 전지 스택(Stack) 효율 모니터링: 98%",
    "안전속도 5030 준수 여부 모니터링: 정상",
    "무가선 구간 전력 소비량 분석 중...",
    "빅데이터 기반 배차 간격 재산출 완료",
    "시민 민원 키워드 '냉방' 급증 -> 공조 제어 신호 전송"
];

const MainDashboard = () => {
  const navigate = useNavigate();
  
  const [stations, setStations] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [accidents, setAccidents] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [selectedStation, setSelectedStation] = useState(null);
  const [realWeather, setRealWeather] = useState({ temp: '-', desc: '기상청 연결중...', icon: 'Loading' });
  const [aiStats, setAiStats] = useState({ speed: 19.8, hydrogen: 85, accuracy: 99.2 });
  const [logs, setLogs] = useState([]);
  const [showBriefing, setShowBriefing] = useState(false);

  useEffect(() => {
    const result = Papa.parse(RAW_CSV_DATA, { header: true, skipEmptyLines: true });
    const validData = result.data.filter(row => row.lat && row.lon).map(row => ({
        id: parseInt(row.station_id),
        name: row.station_name,
        lat: parseFloat(row.lat),
        lon: parseFloat(row.lon),
        transfer: row.transfer_type,
        base_passengers: parseInt(row.base_passengers || 0)
      }));
    setStations(validData);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentTime(new Date());
        setAiStats(prev => ({
            speed: +(19.82 + (Math.random() * 0.4 - 0.2)).toFixed(2), 
            hydrogen: Math.max(20, prev.hydrogen - 0.02),
            accuracy: +(99 + Math.random() * 0.9).toFixed(1)
        }));
        if (Math.random() > 0.7) {
            const newLog = AI_LOGS[Math.floor(Math.random() * AI_LOGS.length)];
            setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString().split(' ')[0]}] ${newLog}`]); 
        }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ⭐ 날씨 API & 안전장치 (4도, 흐림)
  useEffect(() => {
    const fetchWeather = async () => {
        try {
            const API_KEY = '9427bb8459b286c21e5da1ee64da5fb'; 
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Daejeon&appid=${API_KEY}&units=metric&lang=kr`);
            
            if (res.ok) {
                const data = await res.json();
                console.log("✅ 날씨 API 연결 성공:", data);
                setRealWeather({
                    temp: Math.round(data.main.temp),
                    desc: data.weather[0].description,
                    icon: data.weather[0].main
                });
            } else {
                throw new Error(`API Error: ${res.status}`);
            }
        } catch (e) { 
            console.warn("⚠️ 날씨 API 연결 실패 (안전 모드 가동):", e);
            // 🔥 [수정됨] API가 안 될 때(401 에러 등) 보여줄 안전 값: 4도, 흐림
            setRealWeather({
                temp: 4,
                desc: '흐림',
                icon: 'Clouds'
            });
        }
    };
    
    fetchWeather(); 
    const weatherTimer = setInterval(fetchWeather, 600000); 
    return () => clearInterval(weatherTimer);
  }, []);

  useEffect(() => {
    if (stations.length === 0) return;
    const initialTimer = setTimeout(() => triggerAccident(), 5000); 
    const loopInterval = setInterval(() => triggerAccident(), 25000); 
    return () => { clearTimeout(initialTimer); clearInterval(loopInterval); };
  }, [stations]);

  const triggerAccident = () => {
    const scenario = ACCIDENT_SCENARIOS[Math.floor(Math.random() * ACCIDENT_SCENARIOS.length)];
    const newAccident = {
        id: Date.now(),
        stationId: scenario.stId,
        title: scenario.title,
        desc: scenario.desc,
        actionNeeded: scenario.action,
        type: scenario.type,
        processing: false
    };
    setAccidents(prev => {
        const next = prev.length >= 2 ? prev.slice(1) : prev; 
        return [...next, newAccident];
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
        if (stations.length === 0) return;
        const randomStation = stations[Math.floor(Math.random() * stations.length)];
        const randomContent = COMPLAINT_POOL[Math.floor(Math.random() * COMPLAINT_POOL.length)];
        const newComplaint = {
            id: Date.now(),
            stationId: randomStation.id,
            stationName: randomStation.name,
            type: randomContent.type,
            msg: randomContent.msg,
            time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            status: 'received'
        };
        setComplaints(prev => [newComplaint, ...prev].slice(0, 5));
    }, 5000);
    return () => clearInterval(interval);
  }, [stations]);

  const handleResolveComplaint = (id, actionType) => {
    let confirmMsg = "";
    if (actionType === 'TEMP') confirmMsg = "🌡️ 차량 공조기 제어: 설정 온도 -2°C 조정 완료";
    else if (actionType === 'CLEAN') confirmMsg = "🧹 청소 기동반 호출 완료: 다음 정차역 대기";
    else if (actionType === 'DELAY') confirmMsg = "⏱️ AI 배차 조정: 예비 차량 긴급 투입 완료";
    else if (actionType === 'CROWD') confirmMsg = "📢 혼잡 안내 방송 송출 및 안전 요원 배치 완료";
    else confirmMsg = "📞 역무실 통화 연결되었습니다.";

    setToast({ show: true, msg: confirmMsg });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'done' } : c));
  };

  const handleResolveAccident = (id, type) => {
    setAccidents(prev => prev.map(a => a.id === id ? { ...a, processing: true } : a));
    setTimeout(() => {
        let msg = "";
        if (type === 'police') msg = "👮 대전 경찰청 상황실로 사고 접수 및 출동 요청 완료";
        else if (type === 'fire') msg = "🚑 119 구조대 긴급 출동 요청 전송 완료";
        else msg = "🔧 수소 트램 기술 지원팀 현장 급파 완료";
        setToast({ show: true, msg: msg });
        setTimeout(() => {
            setAccidents(prev => prev.filter(a => a.id !== id));
            setToast(prev => ({ ...prev, show: false }));
        }, 1000);
    }, 1500);
  };

  const renderWeatherIcon = () => {
    const iconType = realWeather.icon;
    if (iconType === 'Loading') return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500"></div>;
    // Clouds, Clear 등 API 값에 따라 아이콘 매칭
    if (iconType.includes('Rain') || iconType.includes('Drizzle')) return <CloudRain size={18} />;
    if (iconType.includes('Snow')) return <Snowflake size={18} />;
    if (iconType.includes('Clouds')) return <Cloud size={18} />;
    return <Sun size={18} />;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      
      {/* 🚨 긴급 배너 (슬림형) */}
      {accidents.length > 0 && (
        <div className="absolute top-0 left-0 w-full z-[1000] bg-red-600 shadow-xl text-white px-6 py-2 flex items-center justify-between animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-full animate-ping"><Siren size={20} /></div>
            <div>
                <span className="block text-[10px] font-bold text-red-100 tracking-wider">EMERGENCY ALERT SYSTEM</span>
                <span className="text-lg font-black tracking-wide">{accidents[accidents.length-1].title}</span>
            </div>
          </div>
          <span className="font-bold text-xs bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-md">AI 자동 감지 중...</span>
        </div>
      )}

      {/* 🗺️ 지도 */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <TramMap 
            stations={stations} 
            accidents={accidents} 
            complaints={complaints}
            onMarkerClick={setSelectedStation} 
        />
      </div>

      {/* 🏠 헤더 */}
      <header className={`absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-start pointer-events-none transition-all duration-500 ${accidents.length > 0 ? 'mt-14' : ''}`}>
        <div className="pointer-events-auto flex items-center gap-4">
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2 rounded-lg"><Users size={20}/></div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">트램 ON</h1>
                    <span className="text-[10px] font-bold text-blue-600 tracking-widest">INTEGRATED CONTROL</span>
                </div>
            </div>
            {/* 날씨 정보 */}
            <div className="bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-6 text-sm font-bold text-slate-600">
                <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400"/> {currentTime.toLocaleDateString()}</div>
                <div className="flex items-center gap-2 w-24"><Clock size={16} className="text-slate-400"/> {currentTime.toLocaleTimeString()}</div>
                <div className="flex items-center gap-2 text-orange-500 border-l pl-6 border-slate-200 min-w-[150px]">
                    {renderWeatherIcon()} {realWeather.temp !== '-' ? `${realWeather.temp}°C ${realWeather.desc}` : <span className="text-xs text-slate-400">{realWeather.desc}</span>}
                </div>
            </div>
        </div>
        <div className="pointer-events-auto flex gap-3">
            <button onClick={() => setShowBriefing(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-green-200/50 transition-all hover:-translate-y-1">
                <Megaphone size={18} /> AI 시민 안내
            </button>
            <button onClick={() => navigate('/prediction')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/50 transition-all hover:-translate-y-1">
                <MapIcon size={18} /> 미래 예측
            </button>
            <button onClick={() => navigate('/simulation')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-200/50 transition-all hover:-translate-y-1">
                상세 시뮬레이터 <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-5 py-3 rounded-xl font-bold shadow-md transition-all">
                <LogOut size={18} />
            </button>
        </div>
      </header>

      {/* 🖥️ [하단 통합 관제 콘솔] */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-[98%] h-72 z-40 flex gap-4 pointer-events-none">
        
        {/* 1. 재난 감지 */}
        <div className="w-[380px] bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-red-100 overflow-hidden pointer-events-auto flex flex-col">
            <div className="bg-red-50 px-5 py-3 border-b border-red-100 flex justify-between items-center">
                <h3 className="font-black text-red-600 flex items-center gap-2"><ShieldAlert size={18}/> 재난/사고 감지</h3>
                <span className="text-xs font-bold text-red-400 animate-pulse">ACTIVE</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {accidents.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2"><CheckCircle size={32} className="text-green-200"/><span>현재 감지된 사고가 없습니다.</span><span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded">SYSTEM NORMAL</span></div>}
                {accidents.map(acc => (
                    <div key={acc.id} className="bg-white border-l-4 border-red-500 p-4 rounded shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-400">{new Date(acc.id).toLocaleTimeString()} 감지</span>
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 rounded">긴급</span>
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">{acc.title}</div>
                            <div className="text-sm text-slate-500">{acc.desc}</div>
                        </div>
                        {acc.processing ? (
                            <div className="bg-slate-100 text-slate-500 text-xs py-2 rounded flex items-center justify-center gap-2 font-bold animate-pulse"><Radio size={14} className="animate-spin"/> 관계 기관 통신 중...</div>
                        ) : (
                            <div className="flex gap-2 mt-1">
                                {acc.actionNeeded === 'police' && <button onClick={() => handleResolveAccident(acc.id, 'police')} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-bold shadow hover:bg-blue-700 transition-colors">경찰 통제 요청</button>}
                                {acc.actionNeeded === 'fire' && <button onClick={() => handleResolveAccident(acc.id, 'fire')} className="flex-1 bg-red-500 text-white py-2 rounded text-xs font-bold shadow hover:bg-red-600 transition-colors">119 출동 요청</button>}
                                {acc.actionNeeded === 'tech' && <button onClick={() => handleResolveAccident(acc.id, 'tech')} className="flex-1 bg-orange-500 text-white py-2 rounded text-xs font-bold shadow hover:bg-orange-600 transition-colors">기술팀 호출</button>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* 2. AI 운영 현황 */}
        <div className="flex-1 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-600"/> AI 운영 현황 모니터링</h3>
                <div className="flex gap-2 items-center">
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">무가선 수소 트램</span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Leaf size={10}/> 친환경</span>
                </div>
            </div>
            
            <div className="flex-1 p-5 flex gap-4">
                <div className="grid grid-cols-2 gap-3 w-1/2">
                    <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex flex-col justify-between">
                        <div className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1"><Gauge size={12}/> 실시간 평균 운행 속도</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">{aiStats.speed}</span>
                            <span className="text-xs font-bold text-slate-400">km/h</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <div className="w-full bg-slate-200 h-1 rounded-full"><div className="bg-blue-500 h-1 rounded-full transition-all duration-500" style={{width: `${(aiStats.speed/50)*100}%`}}></div></div>
                            <span className="text-[10px] text-blue-500 font-bold ml-2">Target 19.82</span>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 flex flex-col justify-between">
                        <div className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1"><Cpu size={12}/> AI 예측 정확도</div>
                        <div className="text-2xl font-black text-slate-900">{aiStats.accuracy}%</div>
                        <div className="text-[10px] text-indigo-500 font-medium mt-1">안전속도 5030 준수 중</div>
                    </div>

                    <div className="col-span-2 bg-green-50/50 rounded-xl p-3 border border-green-100 flex items-center justify-between">
                        <div className="flex flex-col">
                            <div className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1"><Droplets size={12}/> 수소 연료 잔량 (H2)</div>
                            <div className="text-xl font-bold text-green-700">{aiStats.hydrogen.toFixed(1)}% <span className="text-xs font-medium text-slate-400">연료 전지 효율 최적</span></div>
                        </div>
                        <Leaf size={24} className="text-green-400 opacity-80"/>
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col font-mono shadow-inner">
                    <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 border-b border-slate-200 pb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> AI PROCESS LOG
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <div className="absolute bottom-0 left-0 w-full flex flex-col gap-1">
                            {logs.map((log, i) => (
                                <div key={i} className="text-[11px] text-slate-700 truncate animate-fade-in-up">
                                    <span className="text-blue-500 mr-2 font-bold">{'>'}</span>{log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 3. 민원 접수 */}
        <div className="w-[380px] bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><MessageSquare size={18} className="text-blue-500"/> 시민 민원 접수</h3>
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded font-bold animate-pulse">Live Feed</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3 bg-slate-50/50">
                {complaints.length === 0 && <div className="text-center text-xs text-slate-400 py-10">민원 대기 중...</div>}
                {complaints.map((c) => (
                    <div key={c.id} className={`p-3 rounded-xl border text-sm shadow-sm transition-all ${c.status === 'done' ? 'bg-slate-100 opacity-60' : 'bg-white border-blue-100'}`}>
                        <div className="flex justify-between mb-1">
                            <span className="font-bold text-blue-600 text-xs flex items-center gap-1"><MapIcon size={10}/> {c.stationName}</span>
                            <span className="text-[10px] text-slate-400">{c.time}</span>
                        </div>
                        <p className="text-slate-700 mb-2 font-medium">{c.msg}</p>
                        {c.status !== 'done' && (
                            <div className="flex gap-2 mt-1 justify-end">
                                {c.type === 'TEMP' && <button onClick={() => handleResolveComplaint(c.id, 'TEMP')} className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded text-xs font-bold border border-blue-200 flex items-center gap-1 transition-colors"><Thermometer size={12}/> 온도 조절</button>}
                                {c.type === 'CLEAN' && <button onClick={() => handleResolveComplaint(c.id, 'CLEAN')} className="bg-green-50 hover:bg-green-100 text-green-600 px-3 py-1.5 rounded text-xs font-bold border border-green-200 flex items-center gap-1 transition-colors"><Wrench size={12}/> 청소 배차</button>}
                                {c.type === 'DELAY' && <button onClick={() => handleResolveComplaint(c.id, 'DELAY')} className="bg-purple-50 hover:bg-purple-100 text-purple-600 px-3 py-1.5 rounded text-xs font-bold border border-purple-200 flex items-center gap-1 transition-colors"><Bus size={12}/> 예비차 투입</button>}
                                {c.type === 'CROWD' && <button onClick={() => handleResolveComplaint(c.id, 'CROWD')} className="bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 rounded text-xs font-bold border border-orange-200 flex items-center gap-1 transition-colors"><Megaphone size={12}/> 안내 방송</button>}
                                <button onClick={() => handleResolveComplaint(c.id, 'CALL')} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded text-xs border border-slate-200 flex items-center gap-1 transition-colors"><Phone size={12}/> 역무실</button>
                            </div>
                        )}
                        {c.status === 'done' && <div className="flex items-center gap-1 text-green-600 text-xs font-bold justify-end mt-1"><CheckCircle size={12}/> 조치 완료</div>}
                    </div>
                ))}
            </div>
        </div>

      </div>

      {/* 📍 마커 팝업 */}
      {selectedStation && (
        <div className="absolute bottom-80 right-1/2 translate-x-1/2 z-50 bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-slate-200 w-80 animate-fade-in-up text-slate-800 ring-1 ring-slate-100">
          <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
            <div><h2 className="text-2xl font-black text-slate-900">{selectedStation.name}</h2><p className="text-sm text-slate-500 font-bold">Station ID: {selectedStation.id}</p></div>
            <button onClick={() => setSelectedStation(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full">✕</button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-sm font-bold text-slate-500">현재 탑승객</span><span className="text-xl font-black text-blue-600">{selectedStation.base_passengers}명</span></div>
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-bold transition-colors shadow-lg flex items-center justify-center gap-2"><CheckCircle size={16}/> CCTV 실시간 연결</button>
          </div>
        </div>
      )}

      {/* ✅ 알림 토스트 */}
      <div className={`absolute top-32 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-8 py-4 rounded-full shadow-2xl transition-all duration-300 z-[9999] flex items-center gap-3 backdrop-blur-md ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        <CheckCircle className="text-green-400" size={24}/> 
        <span className="font-bold text-lg">{toast.msg}</span>
      </div>

      {/* ⭐ AI 시민 안내 모달 */}
      {showBriefing && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-[600px] overflow-hidden">
                <div className="bg-slate-900 px-8 py-5 flex justify-between items-center">
                    <h2 className="text-xl font-black text-white flex items-center gap-2"><Megaphone className="text-green-400"/> AI 시민 안내 메시지 생성</h2>
                    <button onClick={() => setShowBriefing(false)}><X className="text-slate-400 hover:text-white"/></button>
                </div>
                <div className="p-8">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-5">
                        <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2"><Activity size={16}/> 현재 상황 분석</h4>
                        <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
                            <li>현재 기온: <strong>{realWeather.temp}°C ({realWeather.desc})</strong></li>
                            <li>평균 운행 속도: <strong>{aiStats.speed}km/h (정상)</strong></li>
                            <li>돌발 상황: <strong>{accidents.length > 0 ? accidents[accidents.length-1].title : '특이사항 없음'}</strong></li>
                        </ul>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 mb-2">AI 자동 생성 메시지 (초안)</label>
                        <textarea 
                            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 text-sm focus:outline-none focus:border-blue-500 resize-none font-medium leading-relaxed"
                            readOnly
                            value={accidents.length > 0 
                                ? `[긴급] 현재 ${accidents[accidents.length-1].title}로 인해 일부 구간 지연이 예상됩니다. 우회 교통수단을 이용해주시기 바랍니다. (예상 복구: 15분)`
                                : `[안내] 현재 대전 트램은 정시 운행 중입니다. 현재 기온은 ${realWeather.temp}°C이며 쾌적한 환경을 위해 냉난방 시스템이 가동 중입니다. 안전한 하루 되세요.`}
                        />
                    </div>

                    <button 
                        onClick={() => {
                            setToast({ show: true, msg: "📢 시민 안내 메시지가 전송되었습니다." });
                            setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
                            setShowBriefing(false);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Send size={20}/> 메시지 승인 및 전송
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default MainDashboard;