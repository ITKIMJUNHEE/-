import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TramMap = ({ simulationResult, busStops = [] }) => {
  const stations = simulationResult?.stations || [];
  
  const centerPos = [36.3504, 127.3845];

  const getPathCoords = (idList) => {
    if (!stations || stations.length === 0) return [];
    return idList.map(id => {
      const st = stations.find(s => Number(s.id) === Number(id));
      return st ? [st.lat, st.lon] : null;
    }).filter(coord => coord !== null);
  };

  // 1. 메인 순환선 (201 ~ 240 ~ 201)
  const mainLoopIds = [];
  for (let i = 201; i <= 240; i++) mainLoopIds.push(i);
  mainLoopIds.push(201);

  // 2. 연축 지선 (212 -> 241 -> 244)
  const yeonchukBranchIds = [212, 241, 242, 243, 244];

  // 3. 진잠 지선 (233 -> 245)
  // 233번(관저4)을 중심으로 왼쪽으로 245(진잠) 연결
  const jinjamBranchIds = [233, 245];

  const mainLoopPath = getPathCoords(mainLoopIds);
  const yeonchukPath = getPathCoords(yeonchukBranchIds);
  const jinjamPath = getPathCoords(jinjamBranchIds);

  const getStatusColor = (congestion) => {
    if (congestion >= 120) return "#dc2626"; 
    if (congestion >= 80) return "#ea580c"; 
    return "#10b981"; 
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full z-0 bg-slate-50">
      <MapContainer 
        center={centerPos} 
        zoom={12} 
        zoomControl={false}
        style={{ height: '100vh', width: '100vw' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; 트램 ON'
        />

        {/* 버스 정류장 */}
        {busStops.map((bus) => (
          <CircleMarker
            key={`bus-${bus.id}`}
            center={[bus.lat, bus.lon]}
            radius={2}
            pathOptions={{ color: 'transparent', fillColor: '#94a3b8', fillOpacity: 0.4 }}
          />
        ))}

        {/* 트램 노선 (빨간색) */}
        {mainLoopPath.length > 0 && (
          <Polyline 
            positions={mainLoopPath} 
            pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.8 }} 
          />
        )}
        
        {yeonchukPath.length > 0 && (
          <Polyline 
            positions={yeonchukPath} 
            pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.8 }} 
          />
        )}

        {jinjamPath.length > 0 && (
          <Polyline 
            positions={jinjamPath} 
            pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.8 }} 
          />
        )}

        {/* 정거장 마커 */}
        {stations.map((st) => (
          <CircleMarker 
            key={`tram-${st.id}`} 
            center={[st.lat, st.lon]} 
            radius={st.congestion >= 100 ? 10 : 6}
            pathOptions={{ 
              fillColor: getStatusColor(st.congestion), 
              color: '#fff', 
              weight: 2, 
              fillOpacity: 1 
            }}
          >
            <Popup className="light-popup">
              <div className="text-center p-2 min-w-[150px]">
                <h3 className="font-bold text-lg mb-1 text-gray-900">
                  {st.name} <span className="text-xs text-gray-400">({st.id})</span>
                </h3>
                <div className="text-sm space-y-1 text-gray-700">
                  <p>혼잡도: <span className="font-bold">{st.congestion}%</span></p>
                  <p>예상 승객: {st.passengers}명</p>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default TramMap;