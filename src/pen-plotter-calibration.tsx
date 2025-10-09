import React, { useState } from 'react';
import { Download, Settings } from 'lucide-react';

export default function PlotterCalibration() {
  const [config, setConfig] = useState({
    paperSize: 'A3',
    orientation: 'landscape',
    startSpacing: 0.3,
    endSpacing: 2.0,
    steps: 10,
    numPens: 4,
    squareSize: 25,
    includeCircles: true,
    includeCrosshatch: true,
    includeGradient: false,
    spacingMode: 'auto' as 'auto' | 'manual',
    manualSpacings: '0.3, 0.5, 0.7, 1.0, 1.2, 1.5, 1.8, 2.0',
    showBoundingBoxes: false,
    gradientStepLines: 4,
    numCirclesPerRow: 3
  });

  const paperSizes = {
    'A3': { width: 420, height: 297 },
    'A4': { width: 297, height: 210 },
    'A5': { width: 210, height: 148 },
    'Letter': { width: 279, height: 216 },
    'Tabloid': { width: 432, height: 279 }
  };

  const getDimensions = () => {
    const size = paperSizes[config.paperSize];
    if (config.orientation === 'portrait') {
      return { width: size.height, height: size.width };
    }
    return size;
  };

  const generateSpacings = () => {
    if (config.spacingMode === 'manual') {
      // Parse manual spacings from comma-separated string
      return config.manualSpacings
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n) && n > 0);
    } else {
      // Auto-generate spacings
      const spacings = [];
      const step = (config.endSpacing - config.startSpacing) / (config.steps - 1);
      for (let i = 0; i < config.steps; i++) {
        spacings.push(+(config.startSpacing + step * i).toFixed(3));
      }
      return spacings;
    }
  };

  const generateSVG = () => {
    const dims = getDimensions();
    const { width, height } = dims;
    const spacings = generateSpacings();
    const margin = 10;
    const labelWidth = 45;
    const squareSize = config.squareSize;
    const gapBetweenSquares = 3;
    const gapBetweenSections = 8;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="white"/>
  <g stroke="black" stroke-width="0.1" fill="none">
`;

    // Title
    svg += `    <text x="${width/2}" y="${margin + 4}" font-size="4" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">Pen Calibration Test Sheet</text>\n`;
    svg += `    <text x="${width/2}" y="${margin + 9}" font-size="2.5" text-anchor="middle" font-family="Arial, sans-serif">Per-Pen Test Suite</text>\n`;

    let yOffset = margin + 15;

    // Generate rows for each pen (each row contains all tests)
    const availableHeight = height - yOffset - margin - 5;
    const rowHeight = availableHeight / config.numPens;

    for (let penIdx = 0; penIdx < config.numPens; penIdx++) {
      const rowY = yOffset + penIdx * rowHeight;
      let xOffset = margin;

      // Start a group for this pen row
      svg += `    <g id="pen-row-${penIdx + 1}" data-pen="${penIdx + 1}">\n`;

      // Pen label box
      svg += `      <rect x="${xOffset}" y="${rowY}" width="${labelWidth}" height="${squareSize}" stroke-width="0.2"/>\n`;
      svg += `      <line x1="${xOffset}" y1="${rowY + 6}" x2="${xOffset + labelWidth}" y2="${rowY + 6}" stroke-width="0.1"/>\n`;
      svg += `      <text x="${xOffset + labelWidth/2}" y="${rowY + 4}" font-size="1.5" text-anchor="middle" font-family="Arial, sans-serif">Pen ${penIdx + 1}</text>\n`;
      xOffset += labelWidth + 5;

      // Section 1: Discrete spacing squares
      svg += `      <!-- Discrete spacing tests -->\n`;
      spacings.forEach((spacing, idx) => {
        const x = xOffset + idx * (squareSize + gapBetweenSquares);

        // Square border (optional)
        if (config.showBoundingBoxes) {
          svg += `      <rect x="${x}" y="${rowY}" width="${squareSize}" height="${squareSize}" stroke-width="0.2"/>\n`;
        }

        // Fill with vertical lines at specified spacing
        const numLines = Math.floor(squareSize / spacing);
        for (let i = 0; i <= numLines; i++) {
          const lineX = x + i * spacing;
          if (lineX <= x + squareSize) {
            svg += `      <line x1="${lineX}" y1="${rowY}" x2="${lineX}" y2="${rowY + squareSize}"/>\n`;
          }
        }

        // Add spacing label above square
        svg += `      <text x="${x + squareSize/2}" y="${rowY - 1}" font-size="1.4" text-anchor="middle" font-family="monospace">${spacing.toFixed(2)}</text>\n`;
      });
      xOffset += spacings.length * (squareSize + gapBetweenSquares) + gapBetweenSections;

      // Section 2: Concentric circles (if enabled)
      if (config.includeCircles) {
        svg += `      <!-- Circle tests -->\n`;
        const numCircles = Math.min(config.numCirclesPerRow, spacings.length);
        const circleSpacingsToUse = spacings.slice(0, numCircles);

        circleSpacingsToUse.forEach((spacing, idx) => {
          const xCenter = xOffset + idx * (squareSize + gapBetweenSquares) + squareSize/2;
          const yCenter = rowY + squareSize/2;

          // Bounding box (optional)
          if (config.showBoundingBoxes) {
            svg += `      <rect x="${xOffset + idx * (squareSize + gapBetweenSquares)}" y="${rowY}" width="${squareSize}" height="${squareSize}" stroke-width="0.2"/>\n`;
          }

          // Concentric circles
          for (let r = spacing; r < squareSize/2; r += spacing) {
            svg += `      <circle cx="${xCenter}" cy="${yCenter}" r="${r}"/>\n`;
          }

          // Label
          svg += `      <text x="${xCenter}" y="${rowY - 1}" font-size="1.4" text-anchor="middle" font-family="monospace">${spacing.toFixed(2)}</text>\n`;
        });
        xOffset += numCircles * (squareSize + gapBetweenSquares) + gapBetweenSections;
      }

      // Section 3: Crosshatch (if enabled)
      if (config.includeCrosshatch) {
        svg += `      <!-- Crosshatch tests -->\n`;
        const numCrosshatch = Math.min(2, spacings.length); // Fewer crosshatch to save space
        const crosshatchSpacingsToUse = spacings.slice(0, numCrosshatch);

        crosshatchSpacingsToUse.forEach((spacing, idx) => {
          const x = xOffset + idx * (squareSize + gapBetweenSquares);

          // Bounding box (optional)
          if (config.showBoundingBoxes) {
            svg += `      <rect x="${x}" y="${rowY}" width="${squareSize}" height="${squareSize}" stroke-width="0.2"/>\n`;
          }

          // Draw crosshatch at 45 and -45 degrees
          [45, -45].forEach(angleDeg => {
            const angle = angleDeg * Math.PI / 180;
            for (let offset = -squareSize; offset < squareSize * 2; offset += spacing) {
              const x1 = x + offset;
              const y1 = rowY;
              const x2 = x + offset + squareSize * Math.tan(Math.PI/2 - angle);
              const y2 = rowY + squareSize;
              svg += `      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>\n`;
            }
          });

          // Label
          svg += `      <text x="${x + squareSize/2}" y="${rowY - 1}" font-size="1.4" text-anchor="middle" font-family="monospace">${spacing.toFixed(2)}</text>\n`;
        });
        xOffset += numCrosshatch * (squareSize + gapBetweenSquares) + gapBetweenSections;
      }

      // Section 4: Gradient test (if enabled)
      if (config.includeGradient) {
        svg += `      <!-- Gradient spacing test -->\n`;
        const gradientWidth = squareSize * 2;
        const gradientHeight = squareSize;

        // Bounding box (optional)
        if (config.showBoundingBoxes) {
          svg += `      <rect x="${xOffset}" y="${rowY}" width="${gradientWidth}" height="${gradientHeight}" stroke-width="0.2"/>\n`;
        }

        // Generate gradient: start with startSpacing, gradually increase
        let currentX = xOffset;
        let currentSpacing = config.startSpacing;
        const spacingIncrement = (config.endSpacing - config.startSpacing) / 20; // 20 steps across gradient

        while (currentX < xOffset + gradientWidth) {
          // Draw gradientStepLines lines at current spacing
          for (let i = 0; i < config.gradientStepLines && currentX < xOffset + gradientWidth; i++) {
            svg += `      <line x1="${currentX}" y1="${rowY}" x2="${currentX}" y2="${rowY + gradientHeight}"/>\n`;
            currentX += currentSpacing;
          }
          currentSpacing += spacingIncrement;
        }

        // Label
        svg += `      <text x="${xOffset + gradientWidth/2}" y="${rowY - 1}" font-size="1.4" text-anchor="middle" font-family="monospace">gradient</text>\n`;
      }

      // End group for this pen row
      svg += `    </g>\n`;
    }

    svg += `  </g>
  
  <!-- Reference marks in corners -->
  <g stroke="black" stroke-width="0.2" fill="none">
    <line x1="5" y1="5" x2="10" y2="5"/>
    <line x1="5" y1="5" x2="5" y2="10"/>
    <line x1="${width-5}" y1="5" x2="${width-10}" y2="5"/>
    <line x1="${width-5}" y1="5" x2="${width-5}" y2="10"/>
    <line x1="5" y1="${height-5}" x2="10" y2="${height-5}"/>
    <line x1="5" y1="${height-5}" x2="5" y2="${height-10}"/>
    <line x1="${width-5}" y1="${height-5}" x2="${width-10}" y2="${height-5}"/>
    <line x1="${width-5}" y1="${height-5}" x2="${width-5}" y2="${height-10}"/>
  </g>
</svg>`;
    
    return svg;
  };

  const downloadSVG = () => {
    const svgContent = generateSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plotter-calibration-${config.paperSize}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const spacings = generateSpacings();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Pen Plotter Calibration Sheet</h1>
        
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Paper Size</label>
                <select
                  value={config.paperSize}
                  onChange={(e) => setConfig({...config, paperSize: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="A3">A3 (420×297mm)</option>
                  <option value="A4">A4 (297×210mm)</option>
                  <option value="A5">A5 (210×148mm)</option>
                  <option value="Letter">Letter (11×8.5")</option>
                  <option value="Tabloid">Tabloid (17×11")</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Orientation</label>
                <select
                  value={config.orientation}
                  onChange={(e) => setConfig({...config, orientation: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Number of Pen Rows</label>
                <input
                  type="number"
                  value={config.numPens}
                  onChange={(e) => setConfig({...config, numPens: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded"
                  min="1"
                  max="8"
                />
              </div>

              <div className="pt-2 border-t">
                <label className="block text-sm font-medium mb-2">Spacing Configuration</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={config.spacingMode === 'auto'}
                      onChange={() => setConfig({...config, spacingMode: 'auto'})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Auto-generate spacings</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={config.spacingMode === 'manual'}
                      onChange={() => setConfig({...config, spacingMode: 'manual'})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Manual spacings</span>
                  </label>
                </div>
              </div>

              {config.spacingMode === 'auto' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Spacing (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.startSpacing}
                      onChange={(e) => setConfig({...config, startSpacing: Number(e.target.value)})}
                      className="w-full px-3 py-2 border rounded"
                      min="0.1"
                      max="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">End Spacing (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.endSpacing}
                      onChange={(e) => setConfig({...config, endSpacing: Number(e.target.value)})}
                      className="w-full px-3 py-2 border rounded"
                      min="0.1"
                      max="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Number of Test Squares</label>
                    <input
                      type="number"
                      value={config.steps}
                      onChange={(e) => setConfig({...config, steps: Number(e.target.value)})}
                      className="w-full px-3 py-2 border rounded"
                      min="3"
                      max="15"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Spacing Values (mm)</label>
                  <textarea
                    value={config.manualSpacings}
                    onChange={(e) => setConfig({...config, manualSpacings: e.target.value})}
                    className="w-full px-3 py-2 border rounded font-mono text-sm"
                    rows={3}
                    placeholder="0.3, 0.5, 0.7, 1.0, 1.5, 2.0"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter comma-separated values
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Square Size (mm)</label>
                <input
                  type="number"
                  value={config.squareSize}
                  onChange={(e) => setConfig({...config, squareSize: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded"
                  min="15"
                  max="40"
                />
              </div>

              <div className="pt-2 border-t">
                <label className="block text-sm font-medium mb-2">Test Patterns (per row)</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.includeCircles}
                      onChange={(e) => setConfig({...config, includeCircles: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Concentric Circles</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.includeCrosshatch}
                      onChange={(e) => setConfig({...config, includeCrosshatch: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Crosshatch Patterns</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.includeGradient}
                      onChange={(e) => setConfig({...config, includeGradient: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Gradient Spacing Test</span>
                  </label>
                </div>
              </div>

              {config.includeGradient && (
                <div>
                  <label className="block text-sm font-medium mb-1">Lines per Gradient Step</label>
                  <input
                    type="number"
                    value={config.gradientStepLines}
                    onChange={(e) => setConfig({...config, gradientStepLines: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded"
                    min="2"
                    max="10"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of lines at each spacing before increment
                  </p>
                </div>
              )}

              {config.includeCircles && (
                <div>
                  <label className="block text-sm font-medium mb-1">Circles per Row</label>
                  <input
                    type="number"
                    value={config.numCirclesPerRow}
                    onChange={(e) => setConfig({...config, numCirclesPerRow: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded"
                    min="1"
                    max="6"
                  />
                </div>
              )}

              <div className="pt-2 border-t">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.showBoundingBoxes}
                    onChange={(e) => setConfig({...config, showBoundingBoxes: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Show Bounding Boxes</span>
                </label>
              </div>

              <button
                onClick={downloadSVG}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center gap-2 mt-4"
              >
                <Download className="w-4 h-4" />
                Download SVG
              </button>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
              <strong>Test spacings:</strong>
              <div className="mt-1 flex flex-wrap gap-1">
                {spacings.map((s, i) => (
                  <span key={i} className="bg-white px-1.5 py-0.5 rounded border">
                    {s.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <div className="border rounded-lg p-4 bg-gray-50 overflow-auto">
              <div 
                dangerouslySetInnerHTML={{ __html: generateSVG() }}
                className="mx-auto"
                style={{ maxWidth: '100%' }}
              />
            </div>
            
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <h3 className="font-semibold text-sm mb-2">How to Use:</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Each row is a complete test suite for one pen</li>
                  <li>• Plot one row at a time with each pen</li>
                  <li>• Write pen name/model in label box</li>
                  <li>• All tests use the same spacing values</li>
                  <li>• Compare squares, circles, crosshatch patterns</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 rounded border border-green-200">
                <h3 className="font-semibold text-sm mb-2">What to Look For:</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Discrete tests: Find where lines merge</li>
                  <li>• Circles: Test curved line performance</li>
                  <li>• Crosshatch: Check diagonal overlaps</li>
                  <li>• Gradient: See continuous transition</li>
                  <li>• Note bleeding, feathering, or gaps</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}