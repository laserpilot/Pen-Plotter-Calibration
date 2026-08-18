# Pen Plotter Calibration Tools

A collection of web-based tools for calibrating and testing pen plotters.

**🔗 Live Demo:** [https://laserpilot.github.io/Pen-Plotter-Calibration/](https://laserpilot.github.io/Pen-Plotter-Calibration/)

## Features

### 1. Calibration Sheet Generator ✅
Generate calibration test sheets to find optimal line spacing for your pens and plotter setup.

- **Configurable paper sizes**: A3, A4, A5, Letter, Tabloid, 22×30
- **Multiple test patterns**:
  - Discrete spacing tests with labeled squares
  - Concentric circles for curved line testing
  - Crosshatch patterns for diagonal overlap testing
  - Gradient spacing for continuous transition testing
  - Stippling/dot density for small dot capability
  - Long parallel lines for ink flow consistency
- **Adjustable parameters**: Spacing range (0.2-1.5mm default), square size, number of test rows
- **Pen nib size**: Sets the drawn line width to match your pen's actual nib
- **Per-pen test suite**: Each row contains a complete test suite for one pen
- **SVG export**: Download ready-to-plot calibration sheets
- **Single-line fonts**: All text uses plotter-friendly vector paths (no filled text)
- **Flexible layout**: Toggle header text and bounding boxes on/off

### 2. SVG Spacing Analyzer ✅

Analyze existing SVG files to detect lines, circles, and paths that are too close together, and automatically fix the ones that can be safely spread apart.

- **Automatic spacing detection**: Finds lines, polylines, paths (including curves), and circles/ellipses below your minimum threshold, correctly handling `transform` attributes (translate/scale/rotate/matrix)
- **Grouped, severity-sorted reporting**: Issues are grouped per shape pair (not per sample point) and sorted worst-first, so a dense curve or circle doesn't drown out real problems
- **Auto-fix**: Iteratively nudges straight-line geometry (`line`, `polyline`/`polygon`, and straight-segment `path`s) apart until they clear the threshold. Circles, curves, and arcs are flagged "Manual only" rather than silently mis-edited
- **Visual feedback**: Red markers show problem areas
- **Annotated + Fixed SVG export**: Download a diagnostic copy with problem areas highlighted, or a clean corrected copy after auto-fixing

*Known limitations: `<use>` references aren't resolved, arcs are approximated as straight segments for detection, and very dense point clouds (e.g. stippling) may need a few Auto-Fix passes to fully converge.*

## Getting Started

### Using the Live Demo

Visit [https://laserpilot.github.io/Pen-Plotter-Calibration/](https://laserpilot.github.io/Pen-Plotter-Calibration/) - no installation required!

### Running Locally

#### Prerequisites
- Node.js 18+ and npm

#### Installation

```bash
# Clone the repository
git clone https://github.com/laserpilot/Pen-Plotter-Calibration.git
cd Pen-Plotter-Calibration

# Install dependencies
npm install
```

#### Development

```bash
# Start development server
npm run dev
```

Then open your browser to the URL shown (typically http://localhost:5173)

#### Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

### Deployment

The app automatically deploys to GitHub Pages when changes are pushed to the `main` branch via GitHub Actions.

## Usage Guide

### Calibration Sheet Generator

1. Select your paper size and orientation
2. Configure the spacing range you want to test (e.g., 0.3mm to 2.0mm)
3. Set the number of test squares and pen rows
4. Enable/disable circle and crosshatch tests
5. Click "Download SVG" to get your calibration sheet
6. Plot the sheet and test different pens in each row
7. Note where lines start touching to find your minimum spacing

### SVG Spacing Analyzer

1. Upload an SVG file (e.g. one exported from the Calibration Sheet Generator, or your own plotter art)
2. Set the minimum spacing threshold (mm) you want to enforce
3. Click "Analyze SVG" to detect shapes that are too close together
4. Review the grouped, severity-sorted issues table and the red-marked preview
5. Click "Auto-Fix Close Lines" to nudge fixable geometry (lines, polylines, straight-segment paths) apart — click it again to run more passes if issues remain
6. Download the annotated (diagnostic) or fixed (clean) SVG

Circles, curves, and arcs are reported but not auto-edited — review those manually.

## Project Structure

```
plotter_calibration/
├── src/
│   ├── App.tsx                          # Main app with tab navigation
│   ├── main.tsx                         # React entry point
│   ├── index.css                        # Tailwind CSS imports
│   ├── pen-plotter-calibration.tsx     # Calibration sheet generator
│   └── svg-spacing-analyzer.tsx        # SVG analysis tool
├── index.html                           # HTML entry point
├── package.json                         # Dependencies
├── vite.config.ts                       # Vite configuration
├── tsconfig.json                        # TypeScript configuration
├── tailwind.config.js                   # Tailwind CSS configuration
└── README.md                            # This file
```

## Technologies Used

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **Lucide React**: Icons

## License

MIT
