export const runSimulation = (interval, busReduction, tramData = []) => {
  const BASE_BUDGET = 5000; 

  // 데이터가 아직 로딩 안 됐으면 빈 껍데기 반환
  if (!tramData || tramData.length === 0) {
    return {
      budget: 0, congestion: 0, complaintRisk: '-', 
      complaintMsg: '데이터 로딩 중...', chartData: [], stations: []
    };
  }

  // 1. 예산 계산 (배차 1분 줄일 때마다 300억 추가)
  const tramCost = (15 - interval) * 300; 
  const busSavings = busReduction * 100;
  const totalBudget = BASE_BUDGET + tramCost - busSavings;

  // 2. 역별 상세 시뮬레이션
  const detailedStations = tramData.map(st => {
    // [변수 1] 버스 감축 효과: 버스가 10% 줄면 트램 승객 8% 증가 (대체재)
    const busEffect = st.basePassengers * (busReduction / 100) * 0.8;
    
    // [변수 2] 배차 간격 효과: 배차가 5분 미만이면 유도 수요 10% 증가
    const intervalFactor = interval < 5 ? 1.1 : 1.0;

    const totalPassengers = (st.basePassengers + busEffect) * intervalFactor;

    // [공급] 트램 1대당 250명 * 시간당 운행 횟수 (60/배차)
    const capacityPerHour = 250 * (60 / interval);

    // 혼잡도 = (수요 / 공급) * 100
    // *도로 혼용 구간(Shared)이면 정체로 인해 체감 혼잡도 1.2배
    let congestion = (totalPassengers / capacityPerHour) * 100;
    if (st.isShared) congestion *= 1.2;

    return {
      ...st,
      congestion: Math.round(congestion),
      passengers: Math.round(totalPassengers),
      busEffect: Math.round(busEffect)
    };
  });

  // 평균 혼잡도
  const avgCongestion = Math.round(
    detailedStations.reduce((sum, st) => sum + st.congestion, 0) / detailedStations.length
  );

  // 3. 민원 예측 로직 (수치에 따라 메시지 변경)
  let complaintRisk = "안정";
  let complaintMsg = "정상 운영 범위입니다.";
  
  if (busReduction >= 30) {
    complaintRisk = "심각";
    complaintMsg = `🚨 버스 노선 ${busReduction}% 축소로 환승 민원 폭주!`;
  } else if (avgCongestion >= 120) {
    complaintRisk = "위험";
    complaintMsg = "⚠️ 트램 수용 한계 초과 (탑승 불가 발생)";
  } else if (interval > 12) {
    complaintRisk = "주의";
    complaintMsg = "⏳ 배차 간격 과다로 대기 시간 민원 증가";
  }

  // 4. 차트 데이터 (배차 간격에 따라 그래프 높낮이가 확 변하도록)
  // 배차가 좁으면(좋으면) 혼잡도 낮아짐
  const peakFactor = avgCongestion; 
  const chartData = [
    { time: '06시', val: peakFactor * 0.4 },
    { time: '07시', val: peakFactor * 0.8 },
    { time: '08시', val: peakFactor * 1.3 }, // 출근 피크
    { time: '09시', val: peakFactor * 0.9 },
    { time: '12시', val: peakFactor * 0.6 },
    { time: '18시', val: peakFactor * 1.2 }, // 퇴근 피크
    { time: '20시', val: peakFactor * 0.7 },
    { time: '22시', val: peakFactor * 0.5 },
  ];

  return {
    budget: totalBudget,
    congestion: avgCongestion,
    complaintRisk,
    complaintMsg,
    chartData,
    stations: detailedStations
  };
};