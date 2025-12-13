import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import Papa from 'papaparse';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Zap, AlertTriangle, Settings, ArrowRight, 
  Sun, CloudRain, Snowflake, LogOut, Siren, Map as MapIcon, 
  Users, MessageSquare, Send, CheckCircle, Clock, Calendar
} from 'lucide-react';

// --- 1. 지도 아이콘 설정 ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// --- 2. CSV 데이터 (노선도용) ---
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

// 민원 메시지 풀
const COMPLAINT_POOL = [
    "배차 간격이 너무 길어요! 10분째 기다리는 중...",
    "에어컨 온도가 너무 높아요. 더워요 💦", 
    "서대전역 근처 신호 대기가 너무 깁니다.",
    "출근 시간인데 사람이 꽉 차서 못 탔어요.",
    "급정거 좀 자제해주세요. 넘어질 뻔했습니다.",
    "환승 통로 안내가 부족해요.",
    "와이파이가 자꾸 끊겨요."
];

const MainDashboard = () => {
  const navigate = useNavigate();
  
  // --- 상태 관리 ---
  const [stations, setStations] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 시뮬레이션 파라미터
  const [params, setParams] = useState({ tramInterval: 10, busReduction: 10 });
  
  // 결과값 (예산, 혼잡도)
  const [simResult, setSimResult] = useState({ 
    budget: 4500, 
    congestion: 50,
    budgetDiff: 0,
    congestionDiff: 0
  });

  // 민원 채팅 피드
  const [complaints, setComplaints] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '' });

  // 날씨
  const [weather, setWeather] = useState({ type: 'sunny', temp: 24 });

  // --- 3. 초기 데이터 로드 ---
  useEffect(() => {
    const result = Papa.parse(RAW_CSV_DATA, { header: true, skipEmptyLines: true });
    const validData = result.data
      .filter(row => row.lat && row.lon)
      .map(row => ({
        id: parseInt(row.station_id),
        name: row.station_name,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lon),
        transfer: row.transfer_type
      }));
    setStations(validData);
  }, []);

  // --- 4. 시계 및 날씨 업데이트 ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 5. [수정] 시뮬레이션 결과 계산 (즉각 반영) ---
  useEffect(() => {
    // 예산 계산 로직: 기본 4500억 + 배차간격이 줄수록(자주 다닐수록) 비쌈 - 버스 감축하면 쌈
    const baseBudget = 4500;
    const intervalCost = (15 - params.tramInterval) * 150; // 1분 줄일때마다 150억
    const busSaving = params.busReduction * 50; // 1% 줄일때마다 50억 절약
    const newBudget = baseBudget + intervalCost - busSaving;

    // 혼잡도 계산 로직: 기본 50 + 배차간격 길면 혼잡 + 버스 줄이면 혼잡
    const baseCongestion = 50;
    const intervalFactor = (params.tramInterval - 5) * 3; 
    const busFactor = params.busReduction * 0.8;
    const newCongestion = Math.min(100, Math.max(0, Math.floor(baseCongestion + intervalFactor + busFactor)));

    setSimResult(prev => ({
        budget: newBudget,
        congestion: newCongestion,
        budgetDiff: newBudget - 4500,
        congestionDiff: newCongestion - 50
    }));

  }, [params]);

  // --- 6. [추가] 실시간 민원 채팅 피드 생성 (천천히) ---
  useEffect(() => {
    const interval = setInterval(() => {
        if (stations.length === 0) return;
        
        const randomStation = stations[Math.floor(Math.random() * stations.length)];
        const randomMsg = COMPLAINT_POOL[Math.floor(Math.random() * COMPLAINT_POOL.length)];
        
        const newComplaint = {
            id: Date.now(),
            station: randomStation.name,
            msg: randomMsg,
            time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            status: 'received' // received, processing, done
        };

        setComplaints(prev => [newComplaint, ...prev].slice(0, 5)); // 최근 5개만 유지
    }, 6000); // 6초마다 천천히

    return () => clearInterval(interval);
  }, [stations]);

  // 민원 답장 처리 함수
  const handleReply = (id) => {
    setComplaints(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'done' } : c
    ));
    setToast({ show: true, msg: "✅ 민원인에게 처리 예정 문자를 전송했습니다." });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // 노선 그리기용 데이터 (순환선)
  const mapPositions = useMemo(() => {
    const loop = stations.filter(s => s.id >= 201 && s.id <= 240).sort((a,b) => a.id - b.id);
    const coords = loop.map(s => [s.lat, s.lng]);
    if(coords.length > 2) coords.push(coords[0]);
    return coords;
  }, [stations]);

  const isEmergency = simResult.congestion > 80;

  return (
    <div className={`relative w-screen h-screen overflow-hidden font-sans text-slate-800 bg-slate-50 ${isEmergency ? 'ring-4 ring-red-500' : ''}`}>
      
      {/* 🗺️ 배경 지도 */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={[36.3504, 127.3845]} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {mapPositions.length > 0 && <Polyline positions={mapPositions} pathOptions={{ color: '#3b82f6', weight: 6 }} />}
          {stations.map(s => <Marker key={s.id} position={[s.lat, s.lng]}></Marker>)}
        </MapContainer>
      </div>

      {/* 🏠 헤더 (좌측: 실시간 정보 / 우측: 네비게이션) */}
      <header className="absolute top-0 left-0 w-full p-4 z-50 flex justify-between items-start bg-white/90 backdrop-blur shadow-sm">
        {/* 좌측: 실시간 정보 */}
        <div className="flex flex-col">
            <h1 className="text-3xl font-black text-blue-900 tracking-tighter flex items-center gap-2">
                <Users className="text-blue-600"/> 트램 ON <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded animate-pulse">LIVE</span>
            </h1>
            <div className="flex gap-4 mt-2 text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                <div className="flex items-center gap-1"><Calendar size={14}/> {currentTime.toLocaleDateString()}</div>
                <div className="flex items-center gap-1"><Clock size={14}/> {currentTime.toLocaleTimeString()}</div>
                <div className="flex items-center gap-1 text-orange-500"><Sun size={14}/> 맑음 24°C</div>
            </div>
        </div>

        {/* 우측: 버튼들 */}
        <div className="flex gap-2">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold transition-all">
                <LogOut size={16} /> 로그아웃
            </button>
            <button onClick={() => navigate('/prediction')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all">
                <MapIcon size={16} /> 미래 예측 지도
            </button>
            <button onClick={() => navigate('/simulation')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all">
                상세 시뮬레이터 <ArrowRight size={16} />
            </button>
        </div>
      </header>

      {/* 🎛️ 왼쪽 패널: 시뮬레이션 컨트롤 */}
      <aside className="absolute top-32 left-8 w-80 bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 z-40 border border-slate-200">
        <div className="flex items-center gap-2 mb-6 text-slate-800 border-b pb-2">
            <Settings className="text-slate-500"/> 
            <h2 className="font-bold text-lg">운영 변수 실시간 조정</h2>
        </div>

        {/* 1. 트램 배차 간격 */}
        <div className="mb-6">
            <div className="flex justify-between mb-2 text-sm font-bold">
                <span>트램 배차 간격</span>
                <span className="text-blue-600">{params.tramInterval}분</span>
            </div>
            <input type="range" min="3" max="15" step="1" value={params.tramInterval} onChange={(e) => setParams({...params, tramInterval: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer" />
            <div className="flex justify-between text-xs text-slate-400 mt-1"><span>3분(자주)</span><span>15분(드물게)</span></div>
        </div>

        {/* 2. 버스 감축률 */}
        <div className="mb-6">
            <div className="flex justify-between mb-2 text-sm font-bold">
                <span>버스 노선 감축률</span>
                <span className="text-red-500">{params.busReduction}%</span>
            </div>
            <input type="range" min="0" max="50" step="10" value={params.busReduction} onChange={(e) => setParams({...params, busReduction: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg accent-red-500 cursor-pointer" />
            <div className="flex justify-between text-xs text-slate-400 mt-1"><span>유지</span><span>대폭 감축</span></div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 font-medium">
            💡 배차 간격을 줄이면 예산이 증가하지만 혼잡도가 개선됩니다.
        </div>
      </aside>

      {/* 📊 오른쪽 상단: 시뮬레이션 결과 (즉각 반응) */}
      <aside className="absolute top-32 right-8 w-80 z-40 space-y-4">
        {/* 예산 카드 */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-5 border-l-4 border-blue-600">
            <div className="text-slate-500 text-xs font-bold mb-1 flex justify-between">
                <span>연간 운영 예산</span> <Zap size={14}/>
            </div>
            <div className="text-3xl font-black text-slate-800">
                {simResult.budget.toLocaleString()} <span className="text-sm font-normal text-slate-400">억원</span>
            </div>
            <div className={`text-xs font-bold mt-1 ${simResult.budgetDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {simResult.budgetDiff > 0 ? `▲ ${simResult.budgetDiff}억 증가` : `▼ ${Math.abs(simResult.budgetDiff)}억 절감`}
            </div>
        </div>

        {/* 혼잡도 카드 */}
        <div className={`bg-white/95 backdrop-blur rounded-2xl shadow-xl p-5 border-l-4 transition-colors duration-300 ${simResult.congestion > 80 ? 'border-red-500' : 'border-green-500'}`}>
            <div className="text-slate-500 text-xs font-bold mb-1 flex justify-between">
                <span>평균 혼잡도 예측</span> <AlertTriangle size={14}/>
            </div>
            <div className="flex items-end gap-2">
                <div className={`text-3xl font-black ${simResult.congestion > 80 ? 'text-red-600' : 'text-slate-800'}`}>
                    {simResult.congestion}%
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-bold mb-1 ${simResult.congestion > 80 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {simResult.congestion > 80 ? '위험' : '쾌적'}
                </span>
            </div>
            <div className={`text-xs font-bold mt-1 ${simResult.congestionDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                 {simResult.congestionDiff > 0 ? `▲ ${simResult.congestionDiff}% 악화` : `▼ ${Math.abs(simResult.congestionDiff)}% 개선`}
            </div>
        </div>
      </aside>

      {/* 💬 오른쪽 하단: 실시간 민원 채팅 피드 (천천히 올라옴) */}
      <aside className="absolute bottom-8 right-8 w-80 bg-white/95 backdrop-blur rounded-2xl shadow-2xl z-40 flex flex-col max-h-[400px]">
        <div className="p-4 border-b bg-slate-50 rounded-t-2xl flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare size={16} className="text-blue-500"/> 실시간 민원 접수</h3>
            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-md animate-pulse">Live</span>
        </div>
        
        <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
            {complaints.length === 0 && <div className="text-center text-xs text-slate-400 py-4">민원 대기 중...</div>}
            
            {complaints.map((c) => (
                <div key={c.id} className={`p-3 rounded-xl border text-sm transition-all duration-500 ${c.status === 'done' ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-slate-100 shadow-sm animate-fade-in-up'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-blue-600 text-xs">{c.station}</span>
                        <span className="text-xs text-slate-400">{c.time}</span>
                    </div>
                    <p className="text-slate-700 mb-2">{c.msg}</p>
                    
                    {c.status === 'received' ? (
                        <button 
                            onClick={() => handleReply(c.id)}
                            className="w-full bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                            <Send size={12}/> 답장 및 처리
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-bold justify-end">
                            <CheckCircle size={12}/> 처리 완료
                        </div>
                    )}
                </div>
            ))}
        </div>
      </aside>

      {/* ✅ 중앙 알림 토스트 (답장 시 뜸) */}
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-full shadow-2xl transition-opacity duration-300 z-[9999] flex items-center gap-2 ${toast.show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <CheckCircle className="text-green-400"/> {toast.msg}
      </div>

    </div>
  );
};

export default MainDashboard;