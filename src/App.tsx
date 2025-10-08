import { useState } from 'react'
import PlotterCalibration from './pen-plotter-calibration'
import SVGSpacingAnalyzer from './svg-spacing-analyzer'

export default function App() {
  const [activeTab, setActiveTab] = useState<'calibration' | 'analyzer'>('calibration')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Pen Plotter Tools</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('calibration')}
              className={`px-4 py-2 rounded-t font-medium transition-colors ${
                activeTab === 'calibration'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Calibration Sheet Generator
            </button>
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`px-4 py-2 rounded-t font-medium transition-colors ${
                activeTab === 'analyzer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              SVG Spacing Analyzer
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'calibration' ? <PlotterCalibration /> : <SVGSpacingAnalyzer />}
    </div>
  )
}
