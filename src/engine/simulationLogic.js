engine/simulationLog.js

// judgePolicy를 import 합니다. (이 파일은 src/utils/policyJudge.js에 있어야 합니다.)
import { judgePolicy } from '../utils/policyJudge'; 

// 🚨 주의: 이 tramData는 findAlternative 함수에서 반복 호출 시 필요하지만, 
// 현재 runSimulation 함수는 매개변수로 tramData를 받습니다.
// findAlternative를 간결하게 만들기 위해, tramData를 findAlternative의 인수로 추가해야 합니다.

/**
 * [기존 함수 유지] 시뮬레이션을 실행하고 주요 결과를 반환하는 함수.
 * @param {number} interval - 트램 배차 간격 (분)
 * @param {number} busReduction - 버스 노선 감축률 (%)
 * @param {Array<object>} tramData - 역별 기본 데이터
 * @returns {object} - 예산, 혼잡도, 민원 위험 등 결과
 */
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
      // [변수 1] 버스 감축 효과
      const busEffect = st.basePassengers * (busReduction / 100) * 0.8;
      
      // [변수 2] 배차 간격 효과
      const intervalFactor = interval < 5 ? 1.1 : 1.0;

      const totalPassengers = (st.basePassengers + busEffect) * intervalFactor;

      // [공급] 트램 1대당 250명 * 시간당 운행 횟수 (60/배차)
      const capacityPerHour = 250 * (60 / interval);

      // 혼잡도 = (수요 / 공급) * 100
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
    let complaintScore = 0; // 민원 예측 점수를 추가하여 judgePolicy에 전달

    if (busReduction >= 30) {
      complaintRisk = "심각";
      complaintMsg = `🚨 버스 노선 ${busReduction}% 축소로 환승 민원 폭주!`;
      complaintScore = 80;
    } else if (avgCongestion >= 120) {
      complaintRisk = "위험";
      complaintMsg = "⚠️ 트램 수용 한계 초과 (탑승 불가 발생)";
      complaintScore = 70;
    } else if (interval > 12) {
      complaintRisk = "주의";
      complaintMsg = "⏳ 배차 간격 과다로 대기 시간 민원 증가";
      complaintScore = 50;
    } else {
      complaintScore = 30;
    }
    
    // 4. 차트 데이터 (기존 로직 유지)
    const peakFactor = avgCongestion; 
    const chartData = [
      { time: '06시', val: peakFactor * 0.4 },
      { time: '07시', val: peakFactor * 0.8 },
      { time: '08시', val: peakFactor * 1.3 },
      { time: '09시', val: peakFactor * 0.9 },
      { time: '12시', val: peakFactor * 0.6 },
      { time: '18시', val: peakFactor * 1.2 },
      { time: '20시', val: peakFactor * 0.7 },
      { time: '22시', val: peakFactor * 0.5 },
    ];

    // ********** findAlternative가 필요로 하는 핵심 결과 반환 **********
    return {
      // 1. 정책 판단에 필요한 지표 (judgePolicy 함수의 인수에 맞게 재정의)
      budgetChangePercent: ((totalBudget - BASE_BUDGET) / BASE_BUDGET) * 100, // 예산 증감률
      congestion: avgCongestion, // 혼잡도
      complaintScore: complaintScore, // 민원 위험 점수
      
      // 2. 기존 UI에 필요한 지표
      budget: totalBudget,
      complaintRisk,
      complaintMsg,
      chartData,
      stations: detailedStations
    };
};

/**
 * 조건을 만족하는 최적의 대안을 찾는 함수 (Greedy 탐색).
 * 🟢/🟡 판정을 받으면서 가장 예산 부담이 낮은 시나리오를 찾습니다.
 * * @param {object} currentInput - { tramHeadway: number, busCut: number, ... }
 * @param {Array<object>} tramData - 역별 기본 데이터
 * @returns {object|string} - 최적의 입력값과 결과, 또는 실패 메시지
 */
export const findAlternative = async (currentInput, tramData) => {
    const searchSpace = [];
    // 탐색 범위 설정
    const DISPATCH_INTERVALS = [4, 5, 6, 7, 8, 9, 10, 11, 12]; // 4분 ~ 12분
    const REDUCTION_RATES = [0, 5, 10, 15, 20, 25, 30]; // 0% ~ 30%

    // 1. 모든 시나리오 탐색 및 결과 계산
    for (const dispatch of DISPATCH_INTERVALS) {
        for (const reduction of REDUCTION_RATES) {
            
            // runSimulation 함수를 사용하여 결과를 계산
            const results = runSimulation(dispatch, reduction, tramData); 
            
            // 정책 판단
            const judgement = judgePolicy(
                results.congestion, 
                results.complaintScore, 
                results.budgetChangePercent // 예산 증감률
            );
            
            searchSpace.push({ 
                input: { tramHeadway: dispatch, busCut: reduction }, 
                results, 
                judgement 
            });
        }
    }
    
    // 2. 최적의 시나리오 선택
    // 필터링: '🔴 적용 비권장'이 아닌 시나리오만 선택 (🟢 또는 🟡)
    const validScenarios = searchSpace.filter(s => 
        s.judgement.status !== '🔴 적용 비권장'
    );

    if (validScenarios.length === 0) {
        return "조건(혼잡/민원 위험 없음)을 만족하는 시나리오를 찾을 수 없습니다.";
    }

    // 정렬: 예산 증감률이 가장 낮은 순서로 정렬 (Greedy)
    validScenarios.sort((a, b) => a.results.budgetChangePercent - b.results.budgetChangePercent);

    // 3. 최적안 반환
    return validScenarios[0];
};