import React from 'react';
import { DollarSign, Users, AlertTriangle, Activity } from 'lucide-react';

const Card = ({ title, value, unit, color, icon: Icon, subtext }) => (
  <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-transparent hover:border-blue-500 transition-all">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">
          {value.toLocaleString()} <span className="text-sm font-normal text-gray-400">{unit}</span>
        </h3>
      </div>
      <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')} ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <p className={`text-xs mt-3 font-medium ${subtext.includes('심각') ? 'text-red-500' : 'text-gray-400'}`}>
      {subtext}
    </p>
  </div>
);

const KPICards = ({ results }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card 
        title="총 운영 예산" value={results.budget} unit="억원" icon={DollarSign} color="text-blue-600"
        subtext="전년 대비 변동액 포함"
      />
      <Card 
        title="예측 혼잡도" value={results.congestion} unit="%" icon={Users} 
        color={results.congestion > 120 ? "text-red-500" : "text-green-600"}
        subtext={results.congestion > 120 ? "매우 혼잡" : "쾌적함"}
      />
      <Card 
        title="민원 위험도" value={results.complaintRisk} unit="단계" icon={AlertTriangle} 
        color={results.complaintRisk === '심각' ? "text-red-600" : "text-orange-500"}
        subtext={results.complaintMsg}
      />
      <Card 
        title="대중교통 분담률" value={32.5} unit="%" icon={Activity} color="text-purple-600"
        subtext="승용차 이용 감소 효과"
      />
    </div>
  );
};

export default KPICards;