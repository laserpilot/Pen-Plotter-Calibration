import React, { useState, useRef } from 'react';
import { Upload, Download, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SVGSpacingAnalyzer() {
  const [svgContent, setSvgContent] = useState('');
  const [analyzedSVG, setAnalyzedSVG] = useState('');
  const [threshold, setThreshold] = useState(0.5);
  const [issues, setIssues] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [maxComparisons, setMaxComparisons] = useState(1000000);
  const fileInputRef = useRef(null);

  const parsePathData = (d) => {
    // Simple path parser to extract points
    const points = [];
    const commands = d.match(/[MLHVZCSQTAmlhvzcsqta][^MLHVZCSQTAmlhvzcsqta]*/g) || [];
    let currentX = 0, currentY = 0;
    
    commands.forEach(cmd => {
      const type = cmd[0];
      const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
      
      if (type === 'M' || type === 'L') {
        for (let i = 0; i < coords.length; i += 2) {
          currentX = coords[i];
          currentY = coords[i + 1];
          points.push({ x: currentX, y: currentY });
        }
      } else if (type === 'm' || type === 'l') {
        for (let i = 0; i < coords.length; i += 2) {
          currentX += coords[i];
          currentY += coords[i + 1];
          points.push({ x: currentX, y: currentY });
        }
      } else if (type === 'H') {
        coords.forEach(x => {
          currentX = x;
          points.push({ x: currentX, y: currentY });
        });
      } else if (type === 'h') {
        coords.forEach(dx => {
          currentX += dx;
          points.push({ x: currentX, y: currentY });
        });
      } else if (type === 'V') {
        coords.forEach(y => {
          currentY = y;
          points.push({ x: currentX, y: currentY });
        });
      } else if (type === 'v') {
        coords.forEach(dy => {
          currentY += dy;
          points.push({ x: currentX, y: currentY });
        });
      }
    });
    
    return points;
  };

  const pointToLineDistance = (point, lineStart, lineEnd) => {
    const { x: px, y: py } = point;
    const { x: x1, y: y1 } = lineStart;
    const { x: x2, y: y2 } = lineEnd;
    
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const analyzeSVG = async () => {
    if (!svgContent) return;

    setAnalyzing(true);
    setIssues([]);
    setProgress(0);
    setProgressMessage('Parsing SVG...');

    // Use setTimeout to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svg = doc.documentElement;

      setProgressMessage('Extracting elements...');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Extract all paths and lines
      const paths = Array.from(svg.querySelectorAll('path'));
      const lines = Array.from(svg.querySelectorAll('line'));
      const polylines = Array.from(svg.querySelectorAll('polyline'));

      const allSegments = [];

      // Process paths
      setProgressMessage(`Processing ${paths.length} paths...`);
      for (let idx = 0; idx < paths.length; idx++) {
        const path = paths[idx];
        const d = path.getAttribute('d');
        if (d) {
          const points = parsePathData(d);
          for (let i = 0; i < points.length - 1; i++) {
            allSegments.push({
              type: 'path',
              index: idx,
              start: points[i],
              end: points[i + 1],
              element: path,
              bbox: {
                minX: Math.min(points[i].x, points[i + 1].x),
                maxX: Math.max(points[i].x, points[i + 1].x),
                minY: Math.min(points[i].y, points[i + 1].y),
                maxY: Math.max(points[i].y, points[i + 1].y)
              }
            });
          }
        }
        if (idx % 100 === 0) {
          setProgress((idx / paths.length) * 20);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Process lines
      setProgressMessage(`Processing ${lines.length} lines...`);
      setProgress(20);
      await new Promise(resolve => setTimeout(resolve, 10));

      lines.forEach((line, idx) => {
        const x1 = parseFloat(line.getAttribute('x1'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y2 = parseFloat(line.getAttribute('y2'));
        allSegments.push({
          type: 'line',
          index: idx,
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          element: line,
          bbox: {
            minX: Math.min(x1, x2),
            maxX: Math.max(x1, x2),
            minY: Math.min(y1, y2),
            maxY: Math.max(y1, y2)
          }
        });
      });

      // Process polylines
      setProgressMessage(`Processing ${polylines.length} polylines...`);
      setProgress(25);
      await new Promise(resolve => setTimeout(resolve, 10));

      polylines.forEach((polyline, idx) => {
        const points = polyline.getAttribute('points').trim().split(/[\s,]+/).map(Number);
        for (let i = 0; i < points.length - 2; i += 2) {
          const x1 = points[i], y1 = points[i + 1];
          const x2 = points[i + 2], y2 = points[i + 3];
          allSegments.push({
            type: 'polyline',
            index: idx,
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            element: polyline,
            bbox: {
              minX: Math.min(x1, x2),
              maxX: Math.max(x1, x2),
              minY: Math.min(y1, y2),
              maxY: Math.max(y1, y2)
            }
          });
        }
      });

      setProgressMessage(`Analyzing ${allSegments.length} segments...`);
      setProgress(30);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check distances between segments with spatial filtering
      const foundIssues = [];
      const closePoints = [];
      const totalComparisons = Math.min(allSegments.length * (allSegments.length - 1) / 2, maxComparisons);
      let comparisons = 0;
      let skipped = 0;

      for (let i = 0; i < allSegments.length && comparisons < maxComparisons; i++) {
        const seg1 = allSegments[i];

        for (let j = i + 1; j < allSegments.length && comparisons < maxComparisons; j++) {
          const seg2 = allSegments[j];

          // Skip if from same element
          if (seg1.element === seg2.element) {
            skipped++;
            continue;
          }

          // Bounding box check - skip if segments are too far apart
          const bboxBuffer = threshold + 1;
          if (seg1.bbox.maxX + bboxBuffer < seg2.bbox.minX ||
              seg1.bbox.minX - bboxBuffer > seg2.bbox.maxX ||
              seg1.bbox.maxY + bboxBuffer < seg2.bbox.minY ||
              seg1.bbox.minY - bboxBuffer > seg2.bbox.maxY) {
            skipped++;
            continue;
          }

          comparisons++;

          // Check distance from seg1 points to seg2 line
          const dist1 = pointToLineDistance(seg1.start, seg2.start, seg2.end);
          const dist2 = pointToLineDistance(seg1.end, seg2.start, seg2.end);
          const dist3 = pointToLineDistance(seg2.start, seg1.start, seg1.end);
          const dist4 = pointToLineDistance(seg2.end, seg1.start, seg1.end);

          const minDist = Math.min(dist1, dist2, dist3, dist4);

          if (minDist < threshold && minDist > 0.01) {
            foundIssues.push({
              distance: minDist.toFixed(3),
              seg1: `${seg1.type} ${seg1.index}`,
              seg2: `${seg2.type} ${seg2.index}`,
              location: `(${seg1.start.x.toFixed(1)}, ${seg1.start.y.toFixed(1)})`
            });

            closePoints.push({
              x: (seg1.start.x + seg1.end.x) / 2,
              y: (seg1.start.y + seg1.end.y) / 2
            });
          }
        }

        // Update progress periodically
        if (i % 50 === 0) {
          const percent = 30 + (comparisons / totalComparisons) * 60;
          setProgress(Math.min(90, percent));
          setProgressMessage(`Checked ${comparisons.toLocaleString()} pairs (${skipped.toLocaleString()} skipped)...`);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      setProgressMessage('Creating annotated SVG...');
      setProgress(95);
      await new Promise(resolve => setTimeout(resolve, 10));

      setIssues(foundIssues.slice(0, 100));

      // Create annotated SVG
      const svgClone = svg.cloneNode(true);

      const annotationLayer = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
      annotationLayer.setAttribute('id', 'spacing-issues');
      annotationLayer.setAttribute('stroke', 'red');
      annotationLayer.setAttribute('fill', 'red');
      annotationLayer.setAttribute('opacity', '0.7');

      closePoints.slice(0, 100).forEach(point => {
        const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', threshold * 2);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', 'red');
        circle.setAttribute('stroke-width', '0.2');
        annotationLayer.appendChild(circle);

        const line1 = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', point.x - threshold);
        line1.setAttribute('y1', point.y);
        line1.setAttribute('x2', point.x + threshold);
        line1.setAttribute('y2', point.y);
        line1.setAttribute('stroke-width', '0.1');
        annotationLayer.appendChild(line1);

        const line2 = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', point.x);
        line2.setAttribute('y1', point.y - threshold);
        line2.setAttribute('x2', point.x);
        line2.setAttribute('y2', point.y + threshold);
        line2.setAttribute('stroke-width', '0.1');
        annotationLayer.appendChild(line2);
      });

      svgClone.appendChild(annotationLayer);

      const serializer = new XMLSerializer();
      const annotatedSVG = serializer.serializeToString(svgClone);
      setAnalyzedSVG(annotatedSVG);

      setProgress(100);
      setProgressMessage(comparisons >= maxComparisons ?
        `Complete (limited to ${maxComparisons.toLocaleString()} comparisons)` :
        'Complete!');

    } catch (error) {
      console.error('Error analyzing SVG:', error);
      alert('Error analyzing SVG: ' + error.message);
    }

    setAnalyzing(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSvgContent(event.target.result);
        setAnalyzedSVG('');
        setIssues([]);
      };
      reader.readAsText(file);
    }
  };

  const downloadAnnotatedSVG = () => {
    if (!analyzedSVG) return;
    const blob = new Blob([analyzedSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotated-spacing-issues.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">SVG Line Spacing Analyzer</h1>
        <p className="text-gray-600 mb-6">Find lines that are too close together in your plotter drawings</p>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Upload SVG File</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".svg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded flex items-center justify-center gap-2 border"
                >
                  <Upload className="w-4 h-4" />
                  Choose SVG File
                </button>
                {svgContent && (
                  <p className="mt-2 text-sm text-green-600">✓ File loaded</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Minimum Spacing Threshold (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                  min="0.1"
                  max="5"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Flag lines closer than this distance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Comparisons
                </label>
                <select
                  value={maxComparisons}
                  onChange={(e) => setMaxComparisons(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="100000">100K (Fast)</option>
                  <option value="500000">500K (Medium)</option>
                  <option value="1000000">1M (Thorough)</option>
                  <option value="5000000">5M (Very Slow)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Higher = more accurate but slower
                </p>
              </div>

              <button
                onClick={analyzeSVG}
                disabled={!svgContent || analyzing}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {analyzing ? 'Analyzing...' : 'Analyze SVG'}
              </button>

              {analyzing && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 text-center">{progressMessage}</p>
                </div>
              )}

              {analyzedSVG && (
                <button
                  onClick={downloadAnnotatedSVG}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Annotated SVG
                </button>
              )}
            </div>

            {/* Results Summary */}
            {issues.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">
                    {issues.length} Issues Found
                  </h3>
                </div>
                <p className="text-sm text-red-700">
                  Lines closer than {threshold}mm detected. Red circles mark problem areas on the preview.
                </p>
              </div>
            )}

            {analyzedSVG && issues.length === 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">
                    No Issues Found
                  </h3>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  All lines meet the minimum spacing requirement.
                </p>
              </div>
            )}
          </div>

          {/* Preview and Issues */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview */}
            {analyzedSVG && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Annotated Preview</h2>
                <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-96">
                  <div 
                    dangerouslySetInnerHTML={{ __html: analyzedSVG }}
                    className="mx-auto"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Red circles and crosses mark areas where lines are too close together
                </p>
              </div>
            )}

            {/* Issues List */}
            {issues.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Detected Issues</h2>
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Distance</th>
                        <th className="p-2 text-left">Element 1</th>
                        <th className="p-2 text-left">Element 2</th>
                        <th className="p-2 text-left">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-red-600">{issue.distance}mm</td>
                          <td className="p-2">{issue.seg1}</td>
                          <td className="p-2">{issue.seg2}</td>
                          <td className="p-2 font-mono text-xs">{issue.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {issues.length === 100 && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      Showing first 100 issues...
                    </p>
                  )}
                </div>
              </div>
            )}

            {!svgContent && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No SVG Loaded
                </h3>
                <p className="text-gray-500">
                  Upload an SVG file to analyze line spacing
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}