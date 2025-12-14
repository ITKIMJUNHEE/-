import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const markerStyle = `
  .ai-marker {
    background-color: rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    border: 3px solid #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  }
  .ai-marker-inner { width: 6px; height: 6px; background-color: #3b82f6; border-radius: 50%; }
  
  .status-normal { border-color: #3b82f6; } 
  .status-warning { border-color: #f59e0b; .ai-marker-inner { background-color: #f59e0b; } }

  .status-danger { 
    background-color: #fee2e2;
    border-color: #ef4444; 
    animation: shockwave 1.5s infinite;
  }
  .status-danger .ai-marker-inner { background-color: #ef4444; }

  @keyframes shockwave {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { transform: scale(1.2); box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }
`;

const TramMap = ({ stations = [], accidents = [], complaints = [], onMarkerClick }) => {
  
  // ⭐ [위치/줌 황금비율] 11.4로 설정하면 위아래 패널이 있어도 노선 전체가 딱 예쁘게 보입니다.
  const centerPos = [36.3504, 127.3845]; 

  const mapData = useMemo(() => {
    if (!stations || stations.length === 0) return { mainLoop: [], yeonchuk: [], jinjam: [] };
    const findSt = (id) => stations.find(s => s.id === id);
    const getCoords = (ids) => ids.map(id => {
        const s = findSt(id);
        return s ? [s.lat, s.lon] : null;
    }).filter(c => c !== null);

    const mainLoopIds = Array.from({length: 40}, (_, i) => 201 + i).concat([201]);
    const yeonchukIds = [212, 241, 242, 243, 244];
    const jinjamIds = [233, 245];

    return {
        mainLoop: getCoords(mainLoopIds),
        yeonchuk: getCoords(yeonchukIds),
        jinjam: getCoords(jinjamIds)
    };
  }, [stations]);

  const accidentPaths = useMemo(() => {
    if (!accidents || accidents.length === 0 || !stations.length) return []; 
    return accidents.map(acc => {
      const stIndex = stations.findIndex(s => s.id === acc.stationId);
      if (stIndex === -1) return null;
      const nextSt = stations[(stIndex + 1) % stations.length]; 
      const currentSt = stations[stIndex];
      if (!currentSt || !nextSt) return null;
      return [[currentSt.lat, currentSt.lon], [nextSt.lat, nextSt.lon]];
    }).filter(p => p !== null);
  }, [accidents, stations]);

  const getMarkerIcon = (stationId) => {
    const isAccident = accidents.find(a => a.stationId === stationId);
    const isComplaint = complaints.find(c => c.stationId === stationId && c.status !== 'done');

    let className = 'ai-marker status-normal';
    let size = [16, 16];

    if (isAccident) {
        className = 'ai-marker status-danger'; 
        size = [24, 24]; 
    } else if (isComplaint) {
        className = 'ai-marker status-warning';
    }

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="${className}" style="width: 100%; height: 100%; display:flex; align-items:center; justify-content:center;"><div class="ai-marker-inner"></div></div>`,
      iconSize: size,
      iconAnchor: [size[0]/2, size[1]/2]
    });
  };

  // ⭐ 데이터 로딩 전에는 렌더링 하지 않음 (이상한 위치 마커 방지)
  if (!stations || stations.length === 0) return null;

  return (
    <div className="w-full h-full bg-slate-50 z-0">
      <style>{markerStyle}</style>
      <MapContainer center={centerPos} zoom={11.4} zoomSnap={0.1} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
          attribution='&copy; Tram ON' 
        />
        <Polyline positions={mapData.mainLoop} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.6 }} />
        <Polyline positions={mapData.yeonchuk} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.6 }} />
        <Polyline positions={mapData.jinjam} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.6 }} />

        {accidentPaths.map((path, idx) => (
          <Polyline key={`acc-${idx}`} positions={path} pathOptions={{ color: '#dc2626', weight: 10, opacity: 0.9, dashArray: '12, 12', lineCap: 'round' }} />
        ))}

        {stations.map((st) => {
          const isAccident = accidents.find(a => a.stationId === st.id);
          return (
            <Marker 
              key={st.id} 
              position={[st.lat, st.lon]} 
              icon={getMarkerIcon(st.id)}
              eventHandlers={{ click: () => onMarkerClick(st) }}
            >
              {isAccident && (
                <Tooltip permanent direction="top" offset={[0, -20]} className="bg-red-600 text-white font-black border-2 border-white text-lg animate-bounce shadow-xl">
                  🚨 {isAccident.type}
                </Tooltip>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default TramMap;