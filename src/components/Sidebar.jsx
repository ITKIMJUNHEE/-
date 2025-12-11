import React from 'react';
import { Settings, Sliders } from 'lucide-react';

const Sidebar = ({ params, setParams }) => {
  const handleChange = (e) => {
    setParams({ ...params, [e.target.name]: Number(e.target.value) });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full border border-gray-100">
      <div className="flex items-center gap-2 mb-8 text-blue-800">
        <Settings className="w-6 h-6" />
        <h2 className="text-xl font-bold">정책 변수 제어</h2>
      </div>

      <div className="space-y-8">
        <div>
          <label className="flex justify-between font-bold text-gray-700 mb-2">
            트램 배차 간격 <span className="text-blue-600">{params.tramInterval}분</span>
          </label>
          <input
            type="range" name="tramInterval" min="3" max="15" step="1"
            value={params.tramInterval} onChange={handleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div>
          <label className="flex justify-between font-bold text-gray-700 mb-2">
            버스 노선 감축률 <span className="text-red-600">{params.busReduction}%</span>
          </label>
          <input
            type="range" name="busReduction" min="0" max="50" step="5"
            value={params.busReduction} onChange={handleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2 text-gray-700 font-bold text-sm">
          <Sliders className="w-4 h-4" /> 시뮬레이션 가이드
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          배차 간격을 조정하고 버스 노선을 감축하여 
          <strong> 최적의 예산과 혼잡도 균형점</strong>을 찾아보세요.
        </p>
      </div>
    </div>
  );
};

export default Sidebar;