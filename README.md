# Pen Plotter Calibration Tools

A collection of web-based tools for calibrating and testing pen plotters.

## Features

### 1. Calibration Sheet Generator
Generate calibration test sheets to find optimal line spacing for your pens and plotter setup.

- **Configurable paper sizes**: A3, A4, A5, Letter, Tabloid
- **Multiple test patterns**: Line spacing tests, crosshatch patterns, concentric circles
- **Adjustable parameters**: Spacing range, square size, number of test rows
- **SVG export**: Download ready-to-plot calibration sheets

### 2. SVG Spacing Analyzer
Analyze existing SVG files to detect lines that are too close together.

- **Automatic spacing detection**: Find lines below your minimum threshold
- **Visual feedback**: Red markers show problem areas
- **Detailed reports**: Table of all spacing issues found
- **Annotated SVG export**: Download with problem areas highlighted

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install
```

### Running Locally

```bash
# Start development server
npm run dev
```

Then open your browser to the URL shown (typically http://localhost:5173)

### Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

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

1. Click "Choose SVG File" and select your plotter file
2. Set your minimum spacing threshold (based on your pen calibration)
3. Click "Analyze SVG"
4. Review detected issues in the table
5. Download the annotated SVG to see problem areas visually
6. Fix spacing issues in your original design

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
