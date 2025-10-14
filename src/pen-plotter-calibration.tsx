import React, { useState } from 'react';
import { Download, Settings } from 'lucide-react';

export default function PlotterCalibration() {
  const [config, setConfig] = useState({
    paperSize: 'A3',
    orientation: 'landscape',
    startSpacing: 0.2,
    endSpacing: 1.5,
    steps: 15,
    numPens: 5,
    squareSize: 10,
    includeCircles: true,
    includeCrosshatch: false,
    includeGradient: true,
    spacingMode: 'auto' as 'auto' | 'manual',
    manualSpacings: '0.3, 0.5, 0.7, 1.0, 1.2, 1.5, 1.8, 2.0',
    showBoundingBoxes: false,
    gradientStepLines: 4,
    lineOrientation: 'both' as 'both' | 'vertical' | 'horizontal'
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

      // Handle case where start = end (would cause division by zero)
      if (config.startSpacing === config.endSpacing) {
        // Just return the single spacing value repeated
        for (let i = 0; i < config.steps; i++) {
          spacings.push(config.startSpacing);
        }
      } else {
        const step = (config.endSpacing - config.startSpacing) / (config.steps - 1);
        for (let i = 0; i < config.steps; i++) {
          spacings.push(+(config.startSpacing + step * i).toFixed(3));
        }
      }
      return spacings;
    }
  };

  // Simple single-line font renderer using a subset of Hershey Simplex font
  // Data extracted from Hershey font collection - simplified for browser use
  const singleLineFont: Record<string, { width: number; paths: string[] }> = {
    ' ': { width: 8, paths: [] },
    '0': { width: 10, paths: ['M 1,-9 L 9,-9 L 9,0 L 1,0 Z M 1,-9 L 9,0'] },
    '1': { width: 10, paths: ['M 3,-9 L 5,-9 L 5,0'] },
    '2': { width: 10, paths: ['M 1,-9 L 9,-9 L 9,-5 L 1,-5 L 1,0 L 9,0'] },
    '3': { width: 10, paths: ['M 1,-9 L 9,-9 L 9,0 L 1,0 M 1,-5 L 9,-5'] },
    '4': { width: 10, paths: ['M 1,-9 L 1,-5 L 9,-5 M 9,-9 L 9,0'] },
    '5': { width: 10, paths: ['M 9,-9 L 1,-9 L 1,-5 L 9,-5 L 9,0 L 1,0'] },
    '6': { width: 10, paths: ['M 9,-9 L 1,-9 L 1,0 L 9,0 L 9,-5 L 1,-5'] },
    '7': { width: 10, paths: ['M 1,-9 L 9,-9 L 9,0'] },
    '8': { width: 10, paths: ['M 1,-9 L 9,-9 L 9,0 L 1,0 Z M 1,-5 L 9,-5'] },
    '9': { width: 10, paths: ['M 9,-5 L 1,-5 L 1,-9 L 9,-9 L 9,0'] },
    '.': { width: 5, paths: ['M 2,0 L 3,0'] },
    'A': { width: 11, paths: ['M 1,0 L 5.5,-9 L 10,0 M 2.5,-3 L 8.5,-3'] },
    'B': { width: 10, paths: ['M 1,-9 L 1,0 M 1,-9 L 8,-9 L 9,-8 L 9,-5.5 L 8,-4.5 L 1,-4.5 M 8,-4.5 L 9,-3.5 L 9,-1 L 8,0 L 1,0'] },
    'C': { width: 10, paths: ['M 9,-7 L 8,-9 L 2,-9 L 1,-8 L 1,-1 L 2,0 L 8,0 L 9,-2'] },
    'D': { width: 10, paths: ['M 1,-9 L 1,0 M 1,-9 L 7,-9 L 9,-7 L 9,-2 L 7,0 L 1,0'] },
    'E': { width: 9, paths: ['M 9,-9 L 1,-9 L 1,0 L 9,0 M 1,-4.5 L 7,-4.5'] },
    'F': { width: 9, paths: ['M 1,-9 L 1,0 M 1,-9 L 9,-9 M 1,-4.5 L 7,-4.5'] },
    'G': { width: 10, paths: ['M 9,-7 L 8,-9 L 2,-9 L 1,-8 L 1,-1 L 2,0 L 8,0 L 9,-1 L 9,-4 L 5,-4'] },
    'H': { width: 10, paths: ['M 1,-9 L 1,0 M 9,-9 L 9,0 M 1,-4.5 L 9,-4.5'] },
    'I': { width: 4, paths: ['M 2,-9 L 2,0'] },
    'J': { width: 9, paths: ['M 8,-9 L 8,-2 L 7,0 L 2,0 L 1,-1'] },
    'K': { width: 10, paths: ['M 1,-9 L 1,0 M 9,-9 L 1,-3 M 4.5,-5 L 9,0'] },
    'L': { width: 9, paths: ['M 1,-9 L 1,0 L 9,0'] },
    'M': { width: 12, paths: ['M 1,-9 L 1,0 M 1,-9 L 6,-4 M 6,-4 L 11,-9 L 11,0'] },
    'N': { width: 10, paths: ['M 1,-9 L 1,0 M 1,-9 L 9,0 M 9,-9 L 9,0'] },
    'O': { width: 11, paths: ['M 2,-9 L 9,-9 L 10,-8 L 10,-1 L 9,0 L 2,0 L 1,-1 L 1,-8 Z'] },
    'P': { width: 10, paths: ['M 1,-9 L 1,0 M 1,-9 L 8,-9 L 9,-8 L 9,-5 L 8,-4 L 1,-4'] },
    'Q': { width: 11, paths: ['M 2,-9 L 9,-9 L 10,-8 L 10,-1 L 9,0 L 2,0 L 1,-1 L 1,-8 Z M 6,-3 L 10,1'] },
    'R': { width: 10, paths: ['M 1,-9 L 1,0 M 1,-9 L 8,-9 L 9,-8 L 9,-5 L 8,-4 L 1,-4 M 5,-4 L 9,0'] },
    'S': { width: 10, paths: ['M 9,-7 L 8,-9 L 2,-9 L 1,-8 L 1,-6 L 2,-5 L 8,-4 L 9,-3 L 9,-1 L 8,0 L 2,0 L 1,-2'] },
    'T': { width: 9, paths: ['M 0.5,-9 L 8.5,-9 M 4.5,-9 L 4.5,0'] },
    'U': { width: 10, paths: ['M 1,-9 L 1,-1 L 2,0 L 8,0 L 9,-1 L 9,-9'] },
    'V': { width: 11, paths: ['M 1,-9 L 5.5,0 L 10,-9'] },
    'W': { width: 14, paths: ['M 1,-9 L 3.5,0 L 7,-9 L 10.5,0 L 13,-9'] },
    'X': { width: 10, paths: ['M 1,-9 L 9,0 M 9,-9 L 1,0'] },
    'Y': { width: 11, paths: ['M 1,-9 L 5.5,-4 L 5.5,0 M 10,-9 L 5.5,-4'] },
    'Z': { width: 9, paths: ['M 1,-9 L 9,-9 L 1,0 L 9,0'] },
    'a': { width: 9, paths: ['M 7,-6 L 8,-6.5 L 7,-7 L 2,-7 L 1,-6 L 1,-1 L 2,0 L 7,0 L 8,-1 L 8,0 M 8,-3.5 L 2,-3.5'] },
    'b': { width: 9, paths: ['M 1,-9 L 1,0 M 1,-6 L 2,-7 L 7,-7 L 8,-6 L 8,-1 L 7,0 L 2,0 L 1,-1'] },
    'c': { width: 8, paths: ['M 8,-6 L 7,-7 L 2,-7 L 1,-6 L 1,-1 L 2,0 L 7,0 L 8,-1'] },
    'd': { width: 9, paths: ['M 8,-9 L 8,0 M 8,-6 L 7,-7 L 2,-7 L 1,-6 L 1,-1 L 2,0 L 7,0 L 8,-1'] },
    'e': { width: 8, paths: ['M 1,-3.5 L 7,-3.5 L 8,-5 L 7,-7 L 2,-7 L 1,-6 L 1,-1 L 2,0 L 7,0 L 8,-1'] },
    'f': { width: 6, paths: ['M 5,-9 L 4,-10 L 3,-10 L 2,-9 L 2,0 M 1,-7 L 4,-7'] },
    'g': { width: 9, paths: ['M 8,-7 L 8,1 L 7,2 L 2,2 L 1,1 M 8,-6 L 7,-7 L 2,-7 L 1,-6 L 1,-1 L 2,0 L 7,0 L 8,-1'] },
    'h': { width: 9, paths: ['M 1,-9 L 1,0 M 1,-6 L 2,-7 L 7,-7 L 8,-6 L 8,0'] },
    'i': { width: 4, paths: ['M 2,-10 L 2,-9 M 2,-7 L 2,0'] },
    'j': { width: 4, paths: ['M 2,-10 L 2,-9 M 2,-7 L 2,1 L 1,2 L 0,2'] },
    'k': { width: 8, paths: ['M 1,-9 L 1,0 M 7,-7 L 1,-2 M 4,-4 L 7,0'] },
    'l': { width: 4, paths: ['M 2,-9 L 2,0'] },
    'm': { width: 14, paths: ['M 1,-7 L 1,0 M 1,-6 L 2,-7 L 4,-7 L 5,-6 L 5,0 M 5,-6 L 6,-7 L 8,-7 L 9,-6 L 9,0'] },
    'n': { width: 9, paths: ['M 1,-7 L 1,0 M 1,-6 L 2,-7 L 7,-7 L 8,-6 L 8,0'] },
    'o': { width: 9, paths: ['M 2,-7 L 7,-7 L 8,-6 L 8,-1 L 7,0 L 2,0 L 1,-1 L 1,-6 Z'] },
    'p': { width: 9, paths: ['M 1,-7 L 1,2 M 1,-6 L 2,-7 L 7,-7 L 8,-6 L 8,-1 L 7,0 L 2,0 L 1,-1'] },
    'q': { width: 9, paths: ['M 8,-7 L 8,2 M 8,-6 L 7,-7 L 2,-7 L 1,-6 L 1,-1 L 2,0 L 7,0 L 8,-1'] },
    'r': { width: 6, paths: ['M 1,-7 L 1,0 M 1,-5 L 2,-7 L 4,-7 L 5,-6'] },
    's': { width: 7, paths: ['M 7,-6 L 6,-7 L 2,-7 L 1,-6 L 2,-5 L 6,-2 L 5,-1 L 1,-1 L 0,0'] },
    't': { width: 5, paths: ['M 2,-9 L 2,-1 L 3,0 L 4,0 M 1,-7 L 4,-7'] },
    'u': { width: 9, paths: ['M 1,-7 L 1,-1 L 2,0 L 7,0 L 8,-1 M 8,-7 L 8,0'] },
    'v': { width: 8, paths: ['M 1,-7 L 4,0 L 7,-7'] },
    'w': { width: 12, paths: ['M 1,-7 L 3,0 L 6,-7 L 9,0 L 11,-7'] },
    'x': { width: 8, paths: ['M 1,-7 L 7,0 M 7,-7 L 1,0'] },
    'y': { width: 8, paths: ['M 1,-7 L 4,0 M 7,-7 L 4,0 L 3,2 L 1,2'] },
    'z': { width: 7, paths: ['M 1,-7 L 7,-7 L 1,0 L 7,0'] },
    '-': { width: 8, paths: ['M 1,-4.5 L 7,-4.5'] },
  };

  const renderHersheyText = (text: string, x: number, y: number, fontSize: number, anchor: 'start' | 'middle' | 'end' = 'start') => {
    const scale = fontSize / 10; // Font is designed for 10 unit height
    let paths = '';

    // Calculate total width for anchoring
    let totalWidth = 0;
    for (const char of text) {
      const glyph = singleLineFont[char] || singleLineFont[' '];
      totalWidth += glyph.width * scale;
    }

    // Adjust starting x based on anchor
    let currentX = x;
    if (anchor === 'middle') {
      currentX = x - totalWidth / 2;
    } else if (anchor === 'end') {
      currentX = x - totalWidth;
    }

    // Render each character
    for (const char of text) {
      const glyph = singleLineFont[char] || singleLineFont[' '];

      for (const path of glyph.paths) {
        paths += `      <path d="${path}" transform="translate(${currentX}, ${y}) scale(${scale}, ${scale})" stroke="black" stroke-width="${0.1 / scale}" fill="none"/>\n`;
      }

      currentX += glyph.width * scale;
    }

    return paths;
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
    svg += renderHersheyText('Pen Calibration Test Sheet', width / 2, margin + 4, 4, 'middle');
    svg += renderHersheyText('Per-Pen Test Suite', width / 2, margin + 9, 2.5, 'middle');

    let yOffset = margin + 15;

    // Generate rows for each pen (each row contains all tests)
    const availableHeight = height - yOffset - margin - 5;
    const rowHeight = availableHeight / config.numPens;

    for (let penIdx = 0; penIdx < config.numPens; penIdx++) {
      const rowY = yOffset + penIdx * rowHeight;
      let currentY = rowY;

      // Start a group for this pen row
      svg += `    <g id="pen-row-${penIdx + 1}" data-pen="${penIdx + 1}">\n`;

      // Pen label box (spans full height of row)
      const labelHeight = squareSize * 2 + 2; // Height to cover squares + circles
      svg += `      <rect x="${margin}" y="${currentY}" width="${labelWidth}" height="${labelHeight}" stroke-width="0.2"/>\n`;
      svg += `      <line x1="${margin}" y1="${currentY + 6}" x2="${margin + labelWidth}" y2="${currentY + 6}" stroke-width="0.1"/>\n`;
      svg += renderHersheyText(`Pen ${penIdx + 1}`, margin + labelWidth / 2, currentY + 4, 1.5, 'middle');

      const testsStartX = margin + labelWidth + 5;

      // Row 1: Discrete spacing squares with labels above
      svg += `      <!-- Discrete spacing tests -->\n`;
      spacings.forEach((spacing, idx) => {
        const x = testsStartX + idx * (squareSize + gapBetweenSquares);

        // Label above square
        svg += renderHersheyText(spacing.toFixed(2), x + squareSize / 2, currentY - 1, 1.2, 'middle');

        // Square border (optional)
        if (config.showBoundingBoxes) {
          svg += `      <rect x="${x}" y="${currentY}" width="${squareSize}" height="${squareSize}" stroke-width="0.2"/>\n`;
        }

        // Fill with lines at specified spacing
        const numLines = Math.floor(squareSize / spacing);
        const halfHeight = squareSize / 2;

        if (config.lineOrientation === 'both') {
          // Top half: horizontal lines
          for (let i = 0; i <= numLines; i++) {
            const lineY = currentY + i * spacing;
            if (lineY <= currentY + halfHeight) {
              svg += `      <line x1="${x}" y1="${lineY}" x2="${x + squareSize}" y2="${lineY}"/>\n`;
            }
          }

          // Bottom half: vertical lines
          for (let i = 0; i <= numLines; i++) {
            const lineX = x + i * spacing;
            if (lineX <= x + squareSize) {
              svg += `      <line x1="${lineX}" y1="${currentY + halfHeight}" x2="${lineX}" y2="${currentY + squareSize}"/>\n`;
            }
          }

          // Dividing line between halves (optional visual separator)
          svg += `      <line x1="${x}" y1="${currentY + halfHeight}" x2="${x + squareSize}" y2="${currentY + halfHeight}" stroke-width="0.05" opacity="0.3"/>\n`;
        } else if (config.lineOrientation === 'vertical') {
          // All vertical lines
          for (let i = 0; i <= numLines; i++) {
            const lineX = x + i * spacing;
            if (lineX <= x + squareSize) {
              svg += `      <line x1="${lineX}" y1="${currentY}" x2="${lineX}" y2="${currentY + squareSize}"/>\n`;
            }
          }
        } else {
          // All horizontal lines
          for (let i = 0; i <= numLines; i++) {
            const lineY = currentY + i * spacing;
            if (lineY <= currentY + squareSize) {
              svg += `      <line x1="${x}" y1="${lineY}" x2="${x + squareSize}" y2="${lineY}"/>\n`;
            }
          }
        }
      });
      currentY += squareSize + 2; // Move down for circles

      // Row 2: Concentric circles directly below matching squares (if enabled)
      // Now matches ALL squares, not just numCirclesPerRow
      if (config.includeCircles) {
        svg += `      <!-- Circle tests -->\n`;

        spacings.forEach((spacing, idx) => {
          const x = testsStartX + idx * (squareSize + gapBetweenSquares);
          const xCenter = x + squareSize / 2;
          const yCenter = currentY + squareSize / 2;

          // Bounding box (optional)
          if (config.showBoundingBoxes) {
            svg += `      <rect x="${x}" y="${currentY}" width="${squareSize}" height="${squareSize}" stroke-width="0.2"/>\n`;
          }

          // Concentric circles
          for (let r = spacing; r < squareSize / 2; r += spacing) {
            svg += `      <circle cx="${xCenter}" cy="${yCenter}" r="${r}"/>\n`;
          }
        });
        currentY += squareSize + gapBetweenSections; // Move down for next section
      }

      // Row 3: Crosshatch (if enabled)
      if (config.includeCrosshatch) {
        svg += `      <!-- Crosshatch tests -->\n`;
        const numCrosshatch = Math.min(4, spacings.length);
        const crosshatchSpacingsToUse = spacings.slice(0, numCrosshatch);

        crosshatchSpacingsToUse.forEach((spacing, idx) => {
          const x = testsStartX + idx * (squareSize + gapBetweenSquares);

          // Label above
          svg += renderHersheyText(spacing.toFixed(2), x + squareSize / 2, currentY - 1, 1.2, 'middle');

          // Bounding box (optional)
          if (config.showBoundingBoxes) {
            svg += `      <rect x="${x}" y="${currentY}" width="${squareSize}" height="${squareSize}" stroke-width="0.2"/>\n`;
          }

          // Draw crosshatch at 45 and -45 degrees
          [45, -45].forEach(angleDeg => {
            const angle = angleDeg * Math.PI / 180;
            for (let offset = -squareSize; offset < squareSize * 2; offset += spacing) {
              const x1 = x + offset;
              const y1 = currentY;
              const x2 = x + offset + squareSize * Math.tan(Math.PI / 2 - angle);
              const y2 = currentY + squareSize;
              svg += `      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>\n`;
            }
          });
        });
        currentY += squareSize + gapBetweenSections; // Move down for next section
      }

      // Row 4: Gradient test (if enabled)
      if (config.includeGradient) {
        svg += `      <!-- Gradient spacing test -->\n`;
        const gradientWidth = Math.max(100, spacings.length * (squareSize + gapBetweenSquares));
        const gradientHeight = squareSize;

        // Bounding box (optional)
        if (config.showBoundingBoxes) {
          svg += `      <rect x="${testsStartX}" y="${currentY}" width="${gradientWidth}" height="${gradientHeight}" stroke-width="0.2"/>\n`;
        }

        // Generate gradient: start with startSpacing, gradually increase
        let currentX = testsStartX;
        let currentSpacing = config.startSpacing;
        const totalSteps = 20;
        const spacingIncrement = (config.endSpacing - config.startSpacing) / totalSteps;

        // Track positions for labels
        const labelPositions = [
          { x: testsStartX, spacing: config.startSpacing, label: 'start' },
          { x: testsStartX + gradientWidth / 2, spacing: (config.startSpacing + config.endSpacing) / 2, label: 'mid' },
          { x: testsStartX + gradientWidth, spacing: config.endSpacing, label: 'end' }
        ];

        while (currentX < testsStartX + gradientWidth) {
          // Draw gradientStepLines lines at current spacing
          for (let i = 0; i < config.gradientStepLines && currentX < testsStartX + gradientWidth; i++) {
            svg += `      <line x1="${currentX}" y1="${currentY}" x2="${currentX}" y2="${currentY + gradientHeight}"/>\n`;
            currentX += currentSpacing;
          }
          currentSpacing += spacingIncrement;
        }

        // Add numeric labels at start, middle, and end
        svg += renderHersheyText(config.startSpacing.toFixed(2), testsStartX, currentY - 1, 1.2, 'start');
        svg += renderHersheyText(((config.startSpacing + config.endSpacing) / 2).toFixed(2), testsStartX + gradientWidth / 2, currentY - 1, 1.2, 'middle');
        svg += renderHersheyText(config.endSpacing.toFixed(2), testsStartX + gradientWidth, currentY - 1, 1.2, 'end');

        // Label below
        svg += renderHersheyText('gradient', testsStartX + gradientWidth / 2, currentY + gradientHeight + 3, 1.2, 'middle');
      }

      // End group for this pen row
      svg += `    </g>\n`;
    }

    svg += `  </g>
  
  <!-- Reference marks in corners -->
  <g stroke="black" stroke-width="0.2" fill="none">
    <line x1="5" y1="5" x2="10" y2="5"/>
    <line x1="5" y1="5" x2="5" y2="10"/>
    <line x1="${width - 5}" y1="5" x2="${width - 10}" y2="5"/>
    <line x1="${width - 5}" y1="5" x2="${width - 5}" y2="10"/>
    <line x1="5" y1="${height - 5}" x2="10" y2="${height - 5}"/>
    <line x1="5" y1="${height - 5}" x2="5" y2="${height - 10}"/>
    <line x1="${width - 5}" y1="${height - 5}" x2="${width - 10}" y2="${height - 5}"/>
    <line x1="${width - 5}" y1="${height - 5}" x2="${width - 5}" y2="${height - 10}"/>
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
                  onChange={(e) => setConfig({ ...config, paperSize: e.target.value })}
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
                  onChange={(e) => setConfig({ ...config, orientation: e.target.value })}
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
                  onChange={(e) => setConfig({ ...config, numPens: Number(e.target.value) })}
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
                      onChange={() => setConfig({ ...config, spacingMode: 'auto' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Auto-generate spacings</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={config.spacingMode === 'manual'}
                      onChange={() => setConfig({ ...config, spacingMode: 'manual' })}
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
                      onChange={(e) => setConfig({ ...config, startSpacing: Number(e.target.value) })}
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
                      onChange={(e) => setConfig({ ...config, endSpacing: Number(e.target.value) })}
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
                      onChange={(e) => setConfig({ ...config, steps: Number(e.target.value) })}
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
                    onChange={(e) => setConfig({ ...config, manualSpacings: e.target.value })}
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
                  onChange={(e) => setConfig({ ...config, squareSize: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  min="5"
                  max="100"
                />
              </div>

              <div className="pt-2 border-t">
                <label className="block text-sm font-medium mb-2">Test Patterns (per row)</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.includeCircles}
                      onChange={(e) => setConfig({ ...config, includeCircles: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Concentric Circles</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.includeCrosshatch}
                      onChange={(e) => setConfig({ ...config, includeCrosshatch: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Crosshatch Patterns</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.includeGradient}
                      onChange={(e) => setConfig({ ...config, includeGradient: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Gradient Spacing Test</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Line Orientation</label>
                <select
                  value={config.lineOrientation}
                  onChange={(e) => setConfig({ ...config, lineOrientation: e.target.value as 'both' | 'vertical' | 'horizontal' })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="both">Both (H top, V bottom)</option>
                  <option value="vertical">Vertical Only</option>
                  <option value="horizontal">Horizontal Only</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Line direction in spacing test squares
                </p>
              </div>

              {config.includeGradient && (
                <div>
                  <label className="block text-sm font-medium mb-1">Lines per Gradient Step</label>
                  <input
                    type="number"
                    value={config.gradientStepLines}
                    onChange={(e) => setConfig({ ...config, gradientStepLines: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                    min="2"
                    max="10"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of lines at each spacing before increment
                  </p>
                </div>
              )}

              <div className="pt-2 border-t">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.showBoundingBoxes}
                    onChange={(e) => setConfig({ ...config, showBoundingBoxes: e.target.checked })}
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