import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip } from 'react-leaflet';
import { 
  ArrowLeft, Calendar, Settings, Clock, Sun, Sunset, 
  Bot, Sparkles, Zap, Bus, CarFront, AlertTriangle, 
  CloudRain, Snowflake, ShoppingBag
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// ==========================================
// [0] 유틸리티 함수
// ==========================================
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

// ==========================================
// [1] 데이터 (상권 점수 + 지역 타입 포함 45개 정거장)
// ==========================================
const TRAM_STATIONS = [
  { id: 201, name: "서대전역", lat: 36.3218, lng: 127.4042, base: 1200, shared: false, commercialScore: 6, type: 'transit' }, 
  { id: 202, name: "서대전네거리", lat: 36.3225, lng: 127.4038, base: 2500, shared: true, commercialScore: 9, type: 'commercial' },
  { id: 203, name: "대사", lat: 36.3195, lng: 127.4110, base: 600, shared: false, commercialScore: 3, type: 'residential' },
  { id: 204, name: "대흥(이글스파크)", lat: 36.3182, lng: 127.4195, base: 1800, shared: true, commercialScore: 8, type: 'culture' },
  { id: 205, name: "인동", lat: 36.3220, lng: 127.4285, base: 700, shared: false, commercialScore: 4, type: 'residential' },
  { id: 206, name: "대전역(중앙시장)", lat: 36.3315, lng: 127.4325, base: 4500, shared: true, commercialScore: 10, type: 'commercial' },
  { id: 207, name: "대전역(동광장)", lat: 36.3330, lng: 127.4355, base: 1500, shared: false, commercialScore: 6, type: 'transit' },
  { id: 208, name: "대동", lat: 36.3338, lng: 127.4435, base: 1200, shared: false, commercialScore: 5, type: 'transit' },
  { id: 209, name: "자양(우송대)", lat: 36.3385, lng: 127.4485, base: 1400, shared: true, commercialScore: 7, type: 'university' },
  { id: 210, name: "가양", lat: 36.3450, lng: 127.4460, base: 800, shared: false, commercialScore: 4, type: 'residential' },
  { id: 211, name: "동부(복합터미널)", lat: 36.3505, lng: 127.4410, base: 3500, shared: true, commercialScore: 10, type: 'commercial' },
  { id: 212, name: "중리", lat: 36.3580, lng: 127.4305, base: 700, shared: false, commercialScore: 5, type: 'commercial' },
  { id: 213, name: "한남대", lat: 36.3630, lng: 127.4205, base: 1300, shared: true, commercialScore: 7, type: 'university' },
  { id: 214, name: "오정", lat: 36.3675, lng: 127.4120, base: 600, shared: false, commercialScore: 3, type: 'transit' },
  { id: 215, name: "농수산물시장", lat: 36.3685, lng: 127.4010, base: 500, shared: true, commercialScore: 5, type: 'commercial' },
  { id: 216, name: "둔산(재뜰네거리)", lat: 36.3650, lng: 127.3915, base: 2000, shared: false, commercialScore: 10, type: 'commercial' },
  { id: 217, name: "샘머리공원", lat: 36.3610, lng: 127.3855, base: 600, shared: false, commercialScore: 4, type: 'residential' },
  { id: 218, name: "정부청사", lat: 36.3578, lng: 127.3814, base: 2200, shared: false, commercialScore: 9, type: 'transit' },
  { id: 219, name: "월평", lat: 36.3550, lng: 127.3750, base: 900, shared: false, commercialScore: 7, type: 'commercial' },
  { id: 220, name: "만년", lat: 36.3600, lng: 127.3710, base: 600, shared: false, commercialScore: 5, type: 'residential' },
  { id: 221, name: "엑스포과학공원", lat: 36.3750, lng: 127.3850, base: 1800, shared: true, commercialScore: 9, type: 'culture' },
  { id: 222, name: "KAIST", lat: 36.3725, lng: 127.3600, base: 1300, shared: false, commercialScore: 5, type: 'university' },
  { id: 223, name: "유성구청", lat: 36.3630, lng: 127.3570, base: 700, shared: true, commercialScore: 6, type: 'residential' },
  { id: 224, name: "충남대", lat: 36.3605, lng: 127.3480, base: 3000, shared: true, commercialScore: 9, type: 'university' },
  { id: 225, name: "유성온천", lat: 36.3538, lng: 127.3414, base: 4000, shared: true, commercialScore: 10, type: 'commercial' },
  { id: 226, name: "상대", lat: 36.3450, lng: 127.3380, base: 500, shared: false, commercialScore: 3, type: 'residential' },
  { id: 227, name: "원골", lat: 36.3390, lng: 127.3350, base: 400, shared: false, commercialScore: 2, type: 'residential' },
  { id: 228, name: "시립박물관", lat: 36.3320, lng: 127.3310, base: 350, shared: false, commercialScore: 3, type: 'culture' },
  { id: 229, name: "목원대", lat: 36.3300, lng: 127.3350, base: 1200, shared: false, commercialScore: 6, type: 'university' },
  { id: 230, name: "용계", lat: 36.3350, lng: 127.3395, base: 700, shared: false, commercialScore: 2, type: 'residential' },
  { id: 231, name: "대정", lat: 36.3250, lng: 127.3500, base: 900, shared: false, commercialScore: 5, type: 'commercial' },
  { id: 232, name: "원앙", lat: 36.3180, lng: 127.3500, base: 800, shared: false, commercialScore: 3, type: 'residential' },
  { id: 233, name: "관저4", lat: 36.3100, lng: 127.3500, base: 900, shared: false, commercialScore: 4, type: 'residential' },
  { id: 234, name: "관저", lat: 36.3100, lng: 127.3650, base: 1500, shared: true, commercialScore: 8, type: 'commercial' },
  { id: 235, name: "가수원", lat: 36.3100, lng: 127.3800, base: 1400, shared: true, commercialScore: 7, type: 'commercial' },
  { id: 236, name: "정림", lat: 36.3100, lng: 127.3900, base: 1000, shared: false, commercialScore: 3, type: 'residential' },
  { id: 237, name: "복수", lat: 36.3120, lng: 127.4000, base: 900, shared: false, commercialScore: 4, type: 'residential' },
  { id: 238, name: "도마", lat: 36.3150, lng: 127.3920, base: 1600, shared: true, commercialScore: 7, type: 'commercial' },
  { id: 239, name: "유천", lat: 36.3180, lng: 127.3980, base: 1500, shared: true, commercialScore: 6, type: 'commercial' },
  { id: 240, name: "유천4", lat: 36.3200, lng: 127.4010, base: 800, shared: false, commercialScore: 3, type: 'residential' },
  { id: 241, name: "법동", lat: 36.3620, lng: 127.4320, base: 1000, shared: false, commercialScore: 4, type: 'residential' },
  { id: 242, name: "동부여성가족원", lat: 36.3650, lng: 127.4330, base: 800, shared: false, commercialScore: 3, type: 'residential' },
  { id: 243, name: "읍내", lat: 36.3680, lng: 127.4340, base: 900, shared: false, commercialScore: 3, type: 'residential' },
  { id: 244, name: "연축", lat: 36.3811, lng: 127.4402, base: 800, shared: false, commercialScore: 2, type: 'residential' },
  { id: 245, name: "진잠", lat: 36.3100, lng: 127.3350, base: 850, shared: false, commercialScore: 3, type: 'residential' },
];

// ==========================================
// [2] 시뮬레이션 엔진 (Option A: 고감도)
// ==========================================
const runSimulation = (interval, busReduction, busData = [], signalLevel = 2, isAiMode = false, timeSlot = 'day', month = 1) => {
  const BASE_FIXED_COST = 3000; 
  let timeMultiplier = 1.0;
  let demandLabel = "평시";

  if (timeSlot === 'morning') { demandLabel = "출근"; timeMultiplier = 2.5; } 
  else if (timeSlot === 'evening') { demandLabel = "퇴근"; timeMultiplier = 2.0; } 
  else { timeMultiplier = 1.0; }

  let totalAllPassengers = 0;

  const detailedStations = TRAM_STATIONS.map(st => {
    let stationPassengers = st.base;
    
    // [지역 타입 가중치]
    let typeFactor = 1.0;
    if (timeSlot === 'morning' && st.type === 'residential') typeFactor = 2.5; 
    if (timeSlot === 'evening' && st.type === 'commercial') typeFactor = 2.0; 
    stationPassengers *= typeFactor;

    // [상권 점수 반영]
    stationPassengers *= (1 + (st.commercialScore * 0.15));

    // [버스 데이터 연동]
    if (busData && busData.length > 0) {
      const nearbyBuses = busData.filter(bus => Number(bus.nearest_tram_id) === Number(st.id));
      const busPassengerSum = nearbyBuses.reduce((sum, bus) => sum + (Number(bus.passengers) || 0), 0);
      const dailyBusPassengers = busPassengerSum / 30; 
      const transferRate = 0.6 + (busReduction / 100); 
      stationPassengers += (dailyBusPassengers * transferRate);
    }

    const signalFactor = signalLevel === 1 ? 1.3 : (signalLevel === 3 ? 0.8 : 1.0);
    const finalPassengers = stationPassengers * timeMultiplier * signalFactor;
    totalAllPassengers += finalPassengers;

    const peakHourRatio = 0.20; 
    const passengersAtPeak = finalPassengers * peakHourRatio; 
    
    const capacityPerTram = 250; 
    const tripsPerHour = 60 / interval; 
    const totalCapacity = capacityPerTram * tripsPerHour; 

    let congestion = (passengersAtPeak / totalCapacity) * 100;
    
    if (st.shared) congestion *= 1.2;
    if (isAiMode) congestion *= 0.7; 

    return { ...st, congestion: Math.round(congestion), passengers: Math.round(finalPassengers), lon: st.lng };
  });

  const avgCongestion = detailedStations.length > 0 ? Math.round(detailedStations.reduce((sum, st) => sum + st.congestion, 0) / detailedStations.length) : 0;

  let waitTime = interval / 2;
  if (avgCongestion > 120) waitTime = interval * 1.5; 
  else if (avgCongestion > 100) waitTime = interval * 1.2;
  if (isAiMode) waitTime = 3.5; 

  const operationCost = (60 / interval) * 300; 
  let totalBudget = BASE_FIXED_COST + operationCost;
  if (isAiMode) totalBudget *= 0.85; 

  // [승용차 감소 현실화] 일일 승객의 약 12~13% 전환
  const carsReduced = Math.round((totalAllPassengers * 0.12) + (busReduction * 50));
  
  let complaintRisk = "안정";
  let complaintMsg = `${demandLabel} 시간대 원활합니다.`;
  
  if (isAiMode) {
    complaintMsg = `✨ AI 최적화 가동 중`;
  } else {
    if (busReduction >= 40) { complaintRisk = "심각"; complaintMsg = "🚗 버스 과다 감축! 교통 마비!"; }
    else if (avgCongestion > 120) { complaintRisk = "위험"; complaintMsg = `🚨 ${demandLabel} 혼잡도 위험! 배차 좁히세요!`; }
    else if (avgCongestion > 90) { complaintRisk = "주의"; complaintMsg = `⚠️ 주요 역 혼잡 시작.`; }
    else if (interval > 12) { complaintRisk = "주의"; complaintMsg = "🐢 배차가 너무 깁니다."; }
  }

  return { budget: Math.round(totalBudget), congestion: avgCongestion, complaintRisk, complaintMsg, stations: detailedStations, waitTime: waitTime.toFixed(1), carsReduced };
};

// ==========================================
// [3] 컴포넌트
// ==========================================

const Sidebar = ({ params, setParams }) => {
  const handleChange = (e) => setParams({ ...params, [e.target.name]: Number(e.target.value) });
  const handleMonthChange = (e) => setParams({ ...params, month: Number(e.target.value) });
  const handleTimeChange = (newTimeSlot) => {
    let newInterval = params.tramInterval;
    if (params.isAiMode) {
      if (newTimeSlot === 'morning') newInterval = 4;
      else if (newTimeSlot === 'day') newInterval = 12;
      else if (newTimeSlot === 'evening') newInterval = 6;
    }
    setParams({ ...params, timeSlot: newTimeSlot, tramInterval: newInterval });
  };
  const toggleAiMode = (e) => {
    const isAi = e.target.checked;
    let newInterval = params.tramInterval;
    if (isAi) {
      if (params.timeSlot === 'morning') newInterval = 4;
      else if (params.timeSlot === 'day') newInterval = 12;
      else if (params.timeSlot === 'evening') newInterval = 6;
    }
    setParams({ ...params, isAiMode: isAi, tramInterval: newInterval });
  };

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl h-full border border-white/50 flex flex-col p-5">
      <div className="flex items-center gap-2 mb-6 text-blue-800">
        <Settings className="w-6 h-6" />
        <h2 className="text-xl font-bold">운영 정책 제어</h2>
      </div>
      <div className="flex flex-col gap-6 flex-1 h-full justify-start">
        <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs"><Calendar className="w-3.5 h-3.5" /> 분석 시점</div>
            <span className="text-blue-600 font-black text-lg">{params.month}월</span>
          </div>
          <input type="range" min="1" max="12" step="1" value={params.month} onChange={handleMonthChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1"><span>1월</span><span>여름(7월)</span><span>12월</span></div>
        </div>
        <div>
          <label className="flex gap-2 font-bold text-gray-700 mb-2 items-center text-sm"><Clock className="w-4 h-4 text-orange-500" /> 운영 시간대</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: 'morning', label: '오전', icon: Sun }, { id: 'day', label: '평시', icon: Sun }, { id: 'evening', label: '오후', icon: Sunset }].map((slot) => (
              <button key={slot.id} onClick={() => handleTimeChange(slot.id)} className={`flex flex-col items-center justify-center py-3 rounded-lg text-xs font-bold border transition-all ${params.timeSlot === slot.id ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-500'}`}><slot.icon className={`w-4 h-4 mb-1 ${params.timeSlot === slot.id ? 'text-orange-600' : 'text-slate-400'}`} />{slot.label}</button>
            ))}
          </div>
        </div>
        <div className={`p-4 rounded-xl border transition-all ${params.isAiMode ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-2 items-center"><Bot className={`w-5 h-5 ${params.isAiMode ? 'text-blue-600' : 'text-slate-500'}`} /><span className={`font-bold ${params.isAiMode ? 'text-blue-900' : 'text-slate-700'}`}>AI 모드</span></div>
            <input type="checkbox" checked={params.isAiMode} onChange={toggleAiMode} className="w-5 h-5 accent-blue-600 cursor-pointer" />
          </div>
          {params.isAiMode ? <div className="text-[11px] text-blue-800"><Sparkles className="w-3 h-3 inline mr-1 text-yellow-500"/>AI 배차 최적화 중</div> : <p className="text-xs text-slate-500">수동 설정</p>}
        </div>
        <div className={params.isAiMode ? "opacity-50 pointer-events-none" : ""}>
          <label className="flex justify-between font-bold text-gray-700 mb-2 items-center"><div className="flex gap-2"><Clock className="w-4 h-4 text-gray-500" /> 배차 간격</div><span className="text-blue-600 font-bold">{params.tramInterval}분</span></label>
          <input type="range" name="tramInterval" min="3" max="15" step="1" value={params.tramInterval} onChange={handleChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600" />
        </div>
        <div>
          <label className="flex justify-between font-bold text-gray-700 mb-2 items-center"><div className="flex gap-2"><Zap className="w-4 h-4 text-purple-500" /> 신호 우선권</div><span className="text-purple-600 bg-purple-50 px-2 py-1 rounded text-sm">Lv.{params.signalLevel}</span></label>
          <input type="range" name="signalLevel" min="1" max="3" step="1" value={params.signalLevel} onChange={handleChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1 px-1"><span>균형</span><span>우선</span><span>절대</span></div>
        </div>
        <div>
          <label className="flex justify-between font-bold text-gray-700 mb-2 items-center"><div className="flex gap-2"><Bus className="w-4 h-4 text-red-500" /> 버스 감축</div><span className="text-red-600 font-bold">{params.busReduction}%</span></label>
          <input type="range" name="busReduction" min="0" max="50" step="5" value={params.busReduction} onChange={handleChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
        </div>
      </div>
    </div>
  );
};

const KPICards = ({ results }) => {
  if (!results) return null;
  const Card = ({ title, value, unit, color, icon: Icon, subtext }) => (
    <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-md border-l-4 border-transparent hover:border-blue-500 transition-all text-slate-800">
      <div className="flex justify-between items-start">
        <div><p className="text-slate-500 text-[11px] font-bold uppercase">{title}</p><h3 className="text-xl font-black mt-0.5">{value} <span className="text-xs font-normal text-slate-400">{unit}</span></h3></div>
        <div className={`p-2 rounded-full bg-opacity-10 ${color.replace("text-", "bg-")} ${color}`}><Icon className="w-5 h-5" /></div>
      </div>
      <p className={`text-[10px] mt-2 font-medium truncate ${subtext.includes("심각") || subtext.includes("위험") ? "text-red-500" : "text-slate-400"}`}>{subtext}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-3 mb-1">
      <Card title="평균 대기 시간" value={results.waitTime} unit="분" icon={Clock} color={Number(results.waitTime) > 10 ? "text-red-500" : "text-emerald-600"} subtext={Number(results.waitTime) > 10 ? "⚠️ 대기 시간 과다" : "쾌적한 환승 환경"} />
      <Card title="승용차 감소" value={results.carsReduced.toLocaleString()} unit="대/일" icon={CarFront} color="text-purple-600" subtext="도로 혼잡 완화" />
    </div>
  );
};

const TramMap = ({ simulationResult, busStops = [], weather = { type: 'sunny', intensity: 0 } }) => {
  const stations = useMemo(() => {
    const rawStations = simulationResult?.stations || [];
    return rawStations.map(st => {
      let multiplier = 1.0;
      if (weather.type === 'rain') multiplier = 1.0 + (weather.intensity / 100) * 0.3;
      else if (weather.type === 'snow') multiplier = 1.0 + (weather.intensity / 100) * 0.8;
      return { ...st, congestion: Math.round(st.congestion * multiplier) };
    });
  }, [simulationResult, weather]);
  
  const centerPos = [36.3504, 127.3845];
  const mainLoopIds = []; for (let i = 201; i <= 240; i++) mainLoopIds.push(i); mainLoopIds.push(201);
  const yeonchukBranchIds = [212, 241, 242, 243, 244];
  const jinjamBranchIds = [233, 245];

  const getPathCoords = (idList) => idList.map(id => {
    const st = stations.find(s => Number(s.id) === Number(id));
    return st ? [st.lat, st.lon] : null;
  }).filter(c => c !== null);

  const getStatusColor = (congestion) => {
    if (congestion >= 130) return "#dc2626"; // 130 이상 빨강
    if (congestion >= 90) return "#ea580c"; // 90 이상 주황
    return "#10b981"; // 그 외 초록
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full z-0 bg-slate-50">
      <MapContainer center={centerPos} zoom={12} zoomControl={false} style={{ height: '100vh', width: '100vw' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; 트램 ON' />
        
        {/* ⭐⭐⭐ [버스 팻말 & 정류장] ⭐⭐⭐ */}
        {busStops && busStops.map((bus, index) => {
           const lat = parseFloat(bus.lat);
           const lng = parseFloat(bus.lon || bus.lng || bus.long || bus.longitude);
           const passengerCount = Number(bus.passengers) || 0;
           
           if (isNaN(lat) || isNaN(lng)) return null;

           let isNearTram = false;
           for (let tram of TRAM_STATIONS) {
             const dist = getDistanceFromLatLonInKm(lat, lng, tram.lat, tram.lng);
             if (dist <= 0.2) { isNearTram = true; break; }
           }
           if (!isNearTram) return null;

           const radius = Math.min(Math.max(passengerCount / 8000, 3), 7); 
           
           let circleColor = '#cbd5e1'; let fillOpacity = 0.4;
           if (passengerCount > 30000) { circleColor = '#1e3a8a'; fillOpacity = 0.9; } 
           else if (passengerCount > 10000) { circleColor = '#60a5fa'; fillOpacity = 0.7; } 

           return (
             <CircleMarker key={`bus-${index}-${passengerCount}`} center={[lat, lng]} radius={radius} pathOptions={{ color: 'transparent', fillColor: circleColor, fillOpacity: fillOpacity }}>
                {/* 상세 카드 */}
                <Popup>
                   <div className="text-xs min-w-[100px]">
                     <strong className="block text-sm mb-1 text-slate-800">{bus.name}</strong>
                     <div className="flex justify-between items-center bg-slate-50 p-1 rounded">
                       <span className="text-slate-500">월 승하차</span> 
                       <span className="text-blue-600 font-bold">{passengerCount.toLocaleString()}명</span>
                     </div>
                   </div>
                </Popup>
                {/* 🚌 이모지 팻말 (1만명 이상) */}
                {passengerCount > 10000 && (
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                    <span className="text-[14px] drop-shadow-md">🚌</span>
                  </Tooltip>
                )}
             </CircleMarker>
           );
        })}

        {getPathCoords(mainLoopIds).length > 0 && <Polyline positions={getPathCoords(mainLoopIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}
        {getPathCoords(yeonchukBranchIds).length > 0 && <Polyline positions={getPathCoords(yeonchukBranchIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}
        {getPathCoords(jinjamBranchIds).length > 0 && <Polyline positions={getPathCoords(jinjamBranchIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}
        
        {stations.map((st) => (
          <CircleMarker key={`tram-${st.id}`} center={[st.lat, st.lon]} radius={st.congestion >= 100 ? 14 : 9} pathOptions={{ fillColor: getStatusColor(st.congestion), color: '#ffffff', weight: 3, fillOpacity: 1 }}>
            <Popup className="light-popup"><div className="text-center p-2 min-w-[150px]">
              <h3 className="font-bold text-lg mb-1 text-gray-900">{st.name}</h3>
              <p className="text-sm">트램 혼잡도: <span className="font-bold" style={{color: getStatusColor(st.congestion)}}>{st.congestion}%</span></p>
              {st.type === 'commercial' && <p className="text-[10px] text-blue-600 mt-1 font-bold"><ShoppingBag size={10} className="inline mr-1"/>주요 상권</p>}
            </div></Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

// ==========================================
// [4] 최종 메인 페이지 컴포넌트
// ==========================================

const TramPredictionMap = () => {
  const navigate = useNavigate();
  const [params, setParams] = useState({ tramInterval: 10, busReduction: 10, signalLevel: 2, isAiMode: false, timeSlot: 'day', month: 1 });
  const [results, setResults] = useState(null);
  const [busData, setBusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ type: 'sunny', intensity: 0 });

  useEffect(() => {
    setLoading(true);
    fetch(`/data/data_${params.month}.json`)
      .then(res => res.ok ? res.json() : [])
      .then(jsonData => {
        setBusData(jsonData);
        setLoading(false);
      })
      .catch(() => {
        setBusData([]);
        setLoading(false);
      });

    let newWeather = { type: 'sunny', intensity: 0 };
    if (params.month === 7 || params.month === 8) newWeather = { type: 'rain', intensity: 60 };
    else if (params.month === 12 || params.month === 1 || params.month === 2) newWeather = { type: 'snow', intensity: 50 };
    setWeather(newWeather);

  }, [params.month]);

  const executeSimulation = useCallback(() => {
    const simResults = runSimulation(params.tramInterval, params.busReduction, busData, params.signalLevel, params.isAiMode, params.timeSlot, params.month);
    setResults(simResults);
  }, [params, busData]);

  useEffect(() => {
    if (!loading) executeSimulation();
  }, [executeSimulation, loading]);

  if (loading && !results) return <div className="flex h-screen w-screen items-center justify-center bg-white text-blue-600 font-bold text-xl">데이터 분석 중...</div>;

  return (
    <div className={`relative w-screen h-screen overflow-hidden font-sans text-slate-800 select-none bg-slate-50`}>
      
      {/* 지도 */}
      <TramMap simulationResult={results} busStops={busData} weather={weather} />

      {/* 헤더 */}
      <header className={`absolute top-0 left-0 w-full p-6 z-50 pointer-events-none bg-gradient-to-b from-white/90 to-transparent flex justify-between items-start`}>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-blue-900 drop-shadow-sm">트램 ON</h1>
          <p className="text-slate-500 font-bold tracking-widest text-[11px] mt-1 pl-1">DAEJEON TRAM OPTIMIZATION SYSTEM</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 bg-white/80 border border-slate-200 text-slate-600 px-4 py-2 rounded-full font-bold text-xs shadow-sm hover:bg-slate-100 transition-all">
            <ArrowLeft size={14} /> 메인으로
          </button>
        </div>
      </header>

      {/* 왼쪽 패널 */}
      <aside className="absolute top-28 left-6 bottom-8 w-80 z-50 flex flex-col gap-4 hidden md:flex pointer-events-none">
        <div className="flex-1 min-h-0 pointer-events-auto shadow-2xl rounded-2xl overflow-hidden">
          <Sidebar params={params} setParams={setParams} />
        </div>
      </aside>

      {/* 오른쪽 패널 */}
      <aside className="absolute top-28 right-6 bottom-8 w-80 z-50 hidden md:flex flex-col gap-4 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/50 shrink-0 pointer-events-auto">
           <div className="flex items-center gap-2 mb-3 text-blue-700"><Sun className="w-4 h-4" /> <h2 className="font-bold text-sm tracking-wide">기상 조건 설정</h2></div>
           <div className="flex gap-2 mb-4">
              {['sunny', 'rain', 'snow'].map(type => (
                <button key={type} onClick={() => setWeather({ type, intensity: type === 'sunny' ? 0 : 50 })} className={`flex-1 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${weather.type === type ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  {type === 'sunny' ? <Sun size={16}/> : type === 'rain' ? <CloudRain size={16}/> : <Snowflake size={16}/>}{type === 'sunny' ? '맑음' : type === 'rain' ? '비' : '눈'}
                </button>
              ))}
           </div>
           {weather.type !== 'sunny' && <div className="animate-fade-in pt-2 border-t border-slate-100"><div className="flex justify-between text-[11px] font-bold text-slate-600 mb-2"><span>강도</span><span className="text-blue-600">{weather.intensity}%</span></div><input type="range" min="10" max="100" step="10" value={weather.intensity} onChange={(e) => setWeather({...weather, intensity: Number(e.target.value)})} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /></div>}
        </div>
        <div className="pointer-events-auto">
          <KPICards results={results} />
        </div>
      </aside>

      <div className="absolute bottom-3 right-6 z-50 text-[10px] text-slate-500 font-medium bg-white/80 px-3 py-1 rounded-full backdrop-blur-md shadow-sm border border-slate-200">※ 2024년 대전광역시 공공데이터 기반 시뮬레이션</div>
    </div>
  );
};

export default TramPredictionMap;