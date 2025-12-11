import Papa from 'papaparse';

export const fetchAllData = async () => {
  const fetchCleanCSV = async (path) => {
    try {
      // 1. 파일 읽기 (캐시 무시하고 매번 새로 읽기)
      const response = await fetch(path, { cache: "no-store" });
      const text = await response.text();
      
      // 2. 따옴표, 공백, 특수문자 제거
      const cleanText = text.replace(/"/g, '').trim();
      
      return new Promise((resolve) => {
        Papa.parse(cleanText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true, 
          complete: (res) => resolve(res.data),
          error: () => resolve([])
        });
      });
    } catch (err) {
      console.error(`데이터 로딩 실패 (${path}):`, err);
      return [];
    }
  };

  try {
    const [tramData, busData] = await Promise.all([
      fetchCleanCSV('/data/tram_stations.csv'),
      fetchCleanCSV('/data/bus_stops.csv') 
    ]);

    // 트램 데이터 정리 (ID가 없으면 무시)
    const processedTram = tramData
      .filter(row => row.station_id && row.lat && row.lon)
      .map(row => ({
        id: Number(row.station_id),
        name: row.station_name,
        lat: Number(row.lat),
        lon: Number(row.lon),
        basePassengers: Number(row.base_passengers) || 600,
        isShared: String(row.is_shared).toLowerCase() === 'true'
      }))
      .sort((a, b) => a.id - b.id);

    // 버스 데이터 정리
    const processedBus = busData
      .slice(0, 1500)
      .filter(row => (row.와이좌표 || row.lat) && (row.엑스좌표 || row.lon))
      .map((row, idx) => ({
        id: idx,
        lat: Number(row.와이좌표 || row.lat),
        lon: Number(row.엑스좌표 || row.lon),
        name: row.정류장명 || '버스정류장'
      }));

    return { tram: processedTram, bus: processedBus };
  } catch (error) {
    return { tram: [], bus: [] };
  }
};