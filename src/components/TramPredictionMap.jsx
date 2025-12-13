import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import Papa from 'papaparse'; 
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Calendar, Zap, MapPin, 
  Home, Activity, BarChart3, 
  AlertTriangle, Bus, TrendingUp, DollarSign, Clock, 
  Sun, CloudRain, Snowflake, Settings, TrafficCone
} from 'lucide-react';

// --- 1. [CSS] AI 스타일 네온 마커 ---
const markerStyle = `
  .ai-marker {
    background-color: rgba(0, 0, 0, 0.9);
    border-radius: 50%;
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s ease;
  }
  .ai-marker-inner { width: 6px; height: 6px; background-color: #fff; border-radius: 50%; }
  
  /* 상태별 색상 (그림자 효과 강화) */
  .level-1 { border-color: #22c55e; box-shadow: 0 0 8px #22c55e; } /* 원활 */
  .level-2 { border-color: #eab308; box-shadow: 0 0 10px #eab308; } /* 서행 */
  .level-3 { border-color: #f97316; box-shadow: 0 0 14px #f97316; } /* 혼잡 */
  .level-4 { border-color: #ef4444; box-shadow: 0 0 18px #ef4444; animation: pulse 1s infinite; } /* 매우 혼잡 */
  .level-5 { border-color: #7c3aed; box-shadow: 0 0 20px #7c3aed; animation: pulse-fast 0.5s infinite; } /* 마비 */

  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(0,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); } }
  @keyframes pulse-fast { 0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(0,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); } }
`;

// --- 2. 역 정보 ---
const RAW_STATION_INFO = `station_id,station_name,lat,lon
201,서대전역,36.3218,127.4042
202,서대전네거리,36.3225,127.4038
203,대사,36.3195,127.4110
204,대흥(한화이글스파크),36.3182,127.4195
205,인동,36.3220,127.4285
206,대전역(중앙시장),36.3315,127.4325
207,대전역(동광장),36.3330,127.4355
208,대동,36.3338,127.4435
209,자양(우송대),36.3385,127.4485
210,가양,36.3450,127.4460
211,동부(복합터미널),36.3505,127.4410
212,중리,36.3580,127.4305
213,한남대,36.3630,127.4205
214,오정,36.3675,127.4120
215,농수산물시장,36.3685,127.4010
216,둔산(재뜰네거리),36.3650,127.3915
217,샘머리공원,36.3610,127.3855
218,정부청사,36.3578,127.3814
219,월평,36.3550,127.3750
220,만년,36.3600,127.3710
221,엑스포과학공원,36.3750,127.3850
222,KAIST,36.3725,127.3600
223,유성구청,36.3630,127.3570
224,충남대,36.3605,127.3480
225,유성온천,36.3538,127.3414
226,상대,36.3450,127.3380
227,원골,36.3390,127.3350
228,시립박물관,36.3320,127.3310
229,목원대,36.3300,127.3350
230,용계,36.3350,127.3395
231,대정,36.3250,127.3500
232,원앙,36.3180,127.3500
233,관저4,36.3100,127.3500
234,관저,36.3100,127.3650
235,가수원,36.3100,127.3800
236,정림,36.3100,127.3900
237,복수,36.3120,127.4000
238,도마,36.3150,127.3920
239,유천,36.3180,127.3980
240,유천4,36.3200,127.4010
241,법동,36.3620,127.4320
242,동부여성가족원,36.3650,127.4330
243,읍내,36.3680,127.4340
244,연축,36.3811,127.4402
245,진잠,36.3100,127.3350`;

// ⭐ 핵심: 대전 주요 혼잡 역 ID 리스트 (Hotspots) ⭐
// 이 역들은 기본적으로 점수가 높게 설정되어 항상 붐비는 것처럼 보임
const HOTSPOTS = [
  201, 202, // 서대전역, 네거리 (기차역)
  206, 207, // 대전역 (최대 혼잡)
  211, // 복합터미널 (버스 환승)
  218, // 정부청사 (오피스)
  224, 225, // 충남대, 유성온천 (대학가, 번화가)
  238, 239  // 도마, 유천 (주거 밀집)
];

const TramPredictionMap = () => {
  const navigate = useNavigate();
  
  // --- 상태 관리 ---
  const [stations, setStations] = useState([]);
  const [monthlyData, setMonthlyData] = useState({});
  
  // 🎛️ 컨트롤러
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [timeZone, setTimeZone] = useState('day'); 
  const [signalType, setSignalType] = useState('balanced'); 
  const [tramInterval, setTramInterval] = useState(10); 
  const [weather, setWeather] = useState('sunny'); 

  // --- 3. 데이터 로드 ---
  useEffect(() => {
    const result = Papa.parse(RAW_STATION_INFO, { header: true, skipEmptyLines: true });
    const validData = result.data.filter(r => r.lat).map(r => ({
        id: parseInt(r.station_id),
        name: r.station_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon)
    }));
    setStations(validData);
  }, []);

  // HTML 파일 읽기 (없으면 빈 객체)
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/data/${selectedMonth}.html`);
        if (!response.ok) throw new Error("No file");
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll('tr');
        const dataMap = {};
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const id = parseInt(cells[0].innerText.replace(/[^0-9]/g, ''));
            const count = parseInt(cells[1].innerText.replace(/[^0-9]/g, ''));
            if (!isNaN(id)) dataMap[id] = count;
          }
        });
        setMonthlyData(dataMap);
      } catch (err) { setMonthlyData({}); }
    };
    loadData();
  }, [selectedMonth]);

  // --- 4. [핵심 알고리즘] 역별 혼잡도 점수 계산 함수 ---
  // 모든 구간 색칠의 기준이 되는 함수입니다.
  const getStationCongestionScore = (stationId) => {
    let score = 30; // 기본 점수 (한산함)

    // 1. 실제 데이터 반영 (파일 값이 있으면 사용)
    if (monthlyData[stationId]) {
        score = monthlyData[stationId] / 50; // 대략적인 스케일링
    }

    // 2. ⭐ 핫스팟 가중치 (이게 있어야 현실감 있음)
    // 대전역, 유성온천 등은 기본적으로 +40점 먹고 들어감
    if (HOTSPOTS.includes(stationId)) {
        score += 40; 
    }

    // 3. 시간대 (Time Zone) 영향
    if (timeZone === 'morning') {
        // 아침엔 주거지(관저, 도마, 진잠) 쪽이 더 막힘
        if ([233, 234, 235, 238, 245].includes(stationId)) score += 30;
        else score += 10;
    } else if (timeZone === 'evening') {
        // 저녁엔 번화가(둔산, 유성, 은행동) 쪽이 더 막힘
        if ([204, 206, 216, 217, 225].includes(stationId)) score += 35;
        else score += 15;
    }

    // 4. 배차 간격 (Interval) 영향
    // 배차가 길면 승객이 쌓여서 혼잡도 증가
    score += (tramInterval - 5) * 2; 

    // 5. 날씨 (Weather) 영향
    if (weather === 'rain') score *= 1.1;
    if (weather === 'snow') score *= 1.3; // 눈오면 전체적으로 헬게이트

    // 6. 신호 우선권 (Signal) 영향 - 해결사 역할
    if (signalType === 'priority') score *= 0.8;
    if (signalType === 'absolute') score *= 0.5; // 절대 우선시 확 뚫림

    return Math.min(120, Math.max(0, score)); // 0~120 범위 제한
  };

  // --- 5. 노선 구간 계산 (색상 입히기) ---
  const segments = useMemo(() => {
    if (stations.length === 0) return [];
    const segs = [];
    
    // 순환선 및 지선 정의
    const loop = stations.filter(s => s.id >= 201 && s.id <= 240).sort((a,b) => a.id - b.id);
    const fullLoop = [...loop, loop[0]];
    const north = stations.filter(s => s.id === 212 || (s.id >= 241 && s.id <= 244)).sort((a,b) => a.id - b.id);
    const south = stations.filter(s => s.id === 233 || s.id === 245).sort((a,b) => a.id - b.id);

    [fullLoop, north, south].forEach(line => {
        for (let i = 0; i < line.length - 1; i++) {
            const s1 = line[i];
            const s2 = line[i+1];
            
            // 두 역의 혼잡도 평균으로 구간 색상 결정
            const score1 = getStationCongestionScore(s1.id);
            const score2 = getStationCongestionScore(s2.id);
            const avgScore = (score1 + score2) / 2;

            let color = '#22c55e'; // Green
            if (avgScore > 90) color = '#7c3aed'; // Purple (마비)
            else if (avgScore > 75) color = '#ef4444'; // Red
            else if (avgScore > 50) color = '#f97316'; // Orange
            else if (avgScore > 30) color = '#eab308'; // Yellow

            segs.push({ positions: [[s1.lat, s1.lng], [s2.lat, s2.lng]], color, key: `${s1.id}-${s2.id}` });
        }
    });
    return segs;
  }, [stations, monthlyData, timeZone, signalType, tramInterval, weather]);

  // --- 6. 마커 아이콘 생성 ---
  const getMarkerIcon = (stationId) => {
    const score = getStationCongestionScore(stationId);
    let level = 'level-1';
    if (score > 90) level = 'level-5';      // 마비 (보라)
    else if (score > 75) level = 'level-4'; // 매우 혼잡 (빨강)
    else if (score > 50) level = 'level-3'; // 혼잡 (주황)
    else if (score > 30) level = 'level-2'; // 서행 (노랑)

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="ai-marker ${level}" style="width: 14px; height: 14px;"><div class="ai-marker-inner"></div></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7]
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-slate-900 text-white">
      <style>{markerStyle}</style>

      {/* [왼쪽] 컨트롤 패널 */}
      <aside className="w-[400px] min-w-[400px] h-full bg-white text-slate-800 shadow-2xl z-50 flex flex-col border-r border-slate-200">
        
        {/* 네비 */}
        <div className="p-3 bg-slate-50 border-b flex gap-2">
            <button onClick={() => navigate('/dashboard')} className="flex-1 bg-white border py-2 rounded-lg text-sm font-bold"><Home size={16} className="inline mr-1"/> 메인</button>
            <button onClick={() => navigate('/simulation')} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold"><Activity size={16} className="inline mr-1"/> 시뮬레이터</button>
        </div>

        {/* 헤더 */}
        <div className="p-6 bg-white border-b">
          <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">T</div><h1 className="text-2xl font-black">트램 ON</h1></div>
          <p className="text-xs text-blue-600 font-bold">AI SMART TRAFFIC CONTROL</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* 1. 월별 선택 */}
          <div className="bg-slate-50 p-4 rounded-xl border">
             <h3 className="text-sm font-bold mb-3 flex gap-2"><Calendar size={16}/> 데이터 월 선택</h3>
             <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-black text-blue-600">{selectedMonth}월</span>
                <span className="text-xs font-bold text-slate-500">계절 데이터 반영</span>
             </div>
             <input type="range" min="1" max="12" step="1" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600" />
          </div>

          {/* 2. 운영 시간대 */}
          <div>
             <h3 className="text-sm font-bold mb-2 flex gap-2"><Clock size={16}/> 운영 시간대</h3>
             <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setTimeZone('morning')} className={`p-2 rounded-lg text-xs font-bold border ${timeZone==='morning' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white'}`}>오전(출근)</button>
                <button onClick={() => setTimeZone('day')} className={`p-2 rounded-lg text-xs font-bold border ${timeZone==='day' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white'}`}>낮(평시)</button>
                <button onClick={() => setTimeZone('evening')} className={`p-2 rounded-lg text-xs font-bold border ${timeZone==='evening' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white'}`}>오후(퇴근)</button>
             </div>
          </div>

          {/* 3. 신호 우선권 */}
          <div>
             <h3 className="text-sm font-bold mb-2 flex gap-2"><TrafficCone size={16}/> 신호 우선권</h3>
             <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setSignalType('balanced')} className={`p-2 rounded-lg text-xs font-bold border ${signalType==='balanced' ? 'bg-slate-100' : 'bg-white'}`}>균형</button>
                <button onClick={() => setSignalType('priority')} className={`p-2 rounded-lg text-xs font-bold border ${signalType==='priority' ? 'bg-green-50 border-green-500 text-green-600' : 'bg-white'}`}>트램 우선</button>
                <button onClick={() => setSignalType('absolute')} className={`p-2 rounded-lg text-xs font-bold border ${signalType==='absolute' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white'}`}>⚡ 절대 우선</button>
             </div>
          </div>

          {/* 4. 날씨 */}
          <div>
             <h3 className="text-sm font-bold mb-2 flex gap-2"><Sun size={16}/> 기상 조건</h3>
             <div className="flex gap-2">
                <button onClick={() => setWeather('sunny')} className={`flex-1 p-2 rounded-lg text-xs font-bold border ${weather==='sunny' ? 'bg-yellow-50 border-yellow-500 text-yellow-600' : 'bg-white'}`}>☀️ 맑음</button>
                <button onClick={() => setWeather('rain')} className={`flex-1 p-2 rounded-lg text-xs font-bold border ${weather==='rain' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white'}`}>🌧️ 비</button>
                <button onClick={() => setWeather('snow')} className={`flex-1 p-2 rounded-lg text-xs font-bold border ${weather==='snow' ? 'bg-slate-100 border-slate-500 text-slate-700' : 'bg-white'}`}>❄️ 눈</button>
             </div>
          </div>

          {/* 5. 배차 간격 */}
          <div>
             <div className="flex justify-between mb-2 text-sm font-bold">
                <span>트램 배차 간격</span>
                <span className="text-blue-600">{tramInterval}분</span>
             </div>
             <input type="range" min="3" max="20" step="1" value={tramInterval} onChange={(e) => setTramInterval(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600" />
          </div>

        </div>
      </aside>

      {/* [오른쪽] 지도 영역 */}
      <div className="flex-1 relative h-full bg-slate-900">
        <MapContainer center={[36.3504, 127.3845]} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
          
          {/* 구간별 색상 적용 (알록달록) */}
          {segments.map((seg) => (
            <Polyline key={seg.key} positions={seg.positions} pathOptions={{ color: seg.color, weight: 5, opacity: 0.8, lineCap: 'round' }} />
          ))}

          {/* 역 마커 (개별 색상) */}
          {stations.map((s) => (
             <Marker key={s.id} position={[s.lat, s.lng]} icon={getMarkerIcon(s.id)}>
               <Popup>
                 <div className="font-bold text-center">
                    <div className="text-lg">{s.name}</div>
                    <div className="text-xs text-slate-500 mt-1">혼잡 점수: {Math.floor(getStationCongestionScore(s.id))}</div>
                 </div>
               </Popup>
             </Marker>
          ))}
        </MapContainer>

        {/* 범례 */}
        <div className="absolute bottom-8 right-8 bg-slate-800/90 backdrop-blur p-4 rounded-xl shadow-xl border border-slate-700 w-64 text-white">
           <h4 className="font-bold text-blue-400 mb-3 text-sm flex gap-2"><BarChart3 size={14}/> 구간별 혼잡도</h4>
           <div className="space-y-2 text-xs font-bold text-slate-300">
             <div className="flex items-center gap-2"><div className="w-8 h-2 rounded bg-green-500 shadow-[0_0_5px_#22c55e]"></div> <span>원활 (0~30)</span></div>
             <div className="flex items-center gap-2"><div className="w-8 h-2 rounded bg-yellow-500 shadow-[0_0_5px_#eab308]"></div> <span>서행 (30~50)</span></div>
             <div className="flex items-center gap-2"><div className="w-8 h-2 rounded bg-orange-500 shadow-[0_0_5px_#f97316]"></div> <span>혼잡 (50~75)</span></div>
             <div className="flex items-center gap-2"><div className="w-8 h-2 rounded bg-red-500 shadow-[0_0_5px_#ef4444]"></div> <span>매우 혼잡 (75~90)</span></div>
             <div className="flex items-center gap-2"><div className="w-8 h-2 rounded bg-purple-600 shadow-[0_0_5px_#7c3aed]"></div> <span>교통 마비 (90+)</span></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TramPredictionMap;