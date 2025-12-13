import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TramMap = ({ simulationResult, busStops = [], weather = { type: 'sunny', intensity: 0 } }) => {
  
  // 날씨에 따른 정류장 혼잡도 시각화
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

  const getPathCoords = (idList) => {
    if (!stations || stations.length === 0) return [];
    return idList.map(id => {
      const st = stations.find(s => Number(s.id) === Number(id));
      return st ? [st.lat, st.lon] : null;
    }).filter(coord => coord !== null);
  };

  const mainLoopIds = []; for (let i = 201; i <= 240; i++) mainLoopIds.push(i); mainLoopIds.push(201);
  const yeonchukBranchIds = [212, 241, 242, 243, 244];
  const jinjamBranchIds = [233, 245];

  const getStatusColor = (congestion) => {
    if (congestion >= 120) return "#dc2626"; // 빨강
    if (congestion >= 80) return "#ea580c";  // 주황
    return "#10b981"; // 초록
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full z-0 bg-slate-50">
      <MapContainer center={centerPos} zoom={12} zoomControl={false} style={{ height: '100vh', width: '100vw' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; 트램 ON' />

        {/* 버스 정류장 */}
        {busStops.map((bus) => (
          <CircleMarker key={`bus-${bus.id}`} center={[bus.lat, bus.lon]} radius={2} pathOptions={{ color: 'transparent', fillColor: '#94a3b8', fillOpacity: 0.4 }} />
        ))}

        {/* ⭐ [수정] 트램 노선 색상 변경 (Red -> Blue) ⭐ */}
        {getPathCoords(mainLoopIds).length > 0 && <Polyline positions={getPathCoords(mainLoopIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}
        {getPathCoords(yeonchukBranchIds).length > 0 && <Polyline positions={getPathCoords(yeonchukBranchIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}
        {getPathCoords(jinjamBranchIds).length > 0 && <Polyline positions={getPathCoords(jinjamBranchIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}

        {/* 정거장 마커 */}
        {stations.map((st) => (
          <CircleMarker key={`tram-${st.id}`} center={[st.lat, st.lon]} radius={st.congestion >= 100 ? 10 : 6} pathOptions={{ fillColor: getStatusColor(st.congestion), color: '#fff', weight: 2, fillOpacity: 1 }}>
            <Popup className="light-popup">
              <div className="text-center p-2 min-w-[150px]">
                <h3 className="font-bold text-lg mb-1 text-gray-900">{st.name} <span className="text-xs text-gray-400">({st.id})</span></h3>
                <p className="text-sm">혼잡도: <span className="font-bold" style={{color: getStatusColor(st.congestion)}}>{st.congestion}%</span></p>
                {weather.type !== 'sunny' && <p className="text-xs text-red-500 mt-1 font-bold animate-pulse">⚠️ 기상 지연 발생</p>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default TramMap;