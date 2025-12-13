/**
 * PolicyDecisionCard 및 findAlternative에서 호출되어 정책의 적합성을 판단합니다.
 *
 * @param {number} congestion - 혼잡도 (%)
 * @param {number} complaintScore - 민원 위험 점수 (0~100)
 * @param {number} budgetChangePercent - 예산 증감률 (%)
 * @returns {{status: string, comment: string, color: string}} 판단 결과
 */
export const judgePolicy = (congestion, complaintScore, budgetChangePercent) => {
    let status = '🟡 시범 적용 권장';
    let comment = '혼잡도 또는 민원 위험에 대해 추가 모니터링이 필요합니다.';
    let color = 'yellow';

    // 1. 혼잡도 위험 판단 (120% 이상은 여전히 위험)
    if (congestion >= 120) {
        status = '🔴 적용 비권장';
        comment = `🚨 혼잡도 ${congestion.toFixed(0)}%로 트램 수용 한계 초과. 승객 불편 심화가 예상됩니다.`;
        color = 'red';
    } 
    // 2. 민원 위험 판단 (60점 이상은 여전히 위험)
    else if (complaintScore >= 60) {
        status = '🔴 적용 비권장';
        comment = `🚨 민원 위험 점수 ${complaintScore.toFixed(0)}점으로 높음. 특히 버스 감축으로 인한 환승 민원이 우려됩니다.`;
        color = 'red';
    } 
    // 3. 예산 부담 판단 (20% 초과는 여전히 부담)
    else if (budgetChangePercent > 20) {
        status = '🟡 시범 적용 권장';
        comment = `💰 예산 증감률이 ${budgetChangePercent.toFixed(1)}%로 다소 높습니다. 예산 절감을 위한 추가 노력이 필요합니다.`;
        color = 'yellow';
    }
    // ⭐ [수정됨] 4. 최적 정책 판단 기준 완화 (느슨하게)
    // 혼잡도 110%까지, 민원 55점 미만, 예산 15% 이하이면 '통과'로 인정
    else if (congestion <= 110 && complaintScore < 55 && budgetChangePercent <= 15) {
        status = '🟢 즉시 적용 가능';
        comment = '👍 혼잡도와 예산이 합리적인 수준입니다. 정책 시행을 권장합니다.';
        color = 'green';
    }
    
    return { status, comment, color };
};