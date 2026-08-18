import React, { useState, useRef } from 'react';
import { Upload, Download, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';

// ============================================================================
// Geometry primitives
// ============================================================================

interface Point { x: number; y: number; }

// 2D affine matrix: x' = a*x + c*y + e ; y' = b*x + d*y + f
interface Matrix { a: number; b: number; c: number; d: number; e: number; f: number; }

const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function invertMatrix(m: Matrix): Matrix {
  const det = m.a * m.d - m.b * m.c;
  if (!det) return IDENTITY;
  const a = m.d / det, b = -m.b / det, c = -m.c / det, d = m.a / det;
  return { a, b, c, d, e: -(a * m.e + c * m.f), f: -(b * m.e + d * m.f) };
}

function applyPoint(m: Matrix, p: Point): Point {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

// Transforms a delta/direction (ignores translation) rather than a position.
function applyVector(m: Matrix, v: Point): Point {
  return { x: m.a * v.x + m.c * v.y, y: m.b * v.x + m.d * v.y };
}

// Parses an SVG `transform` attribute (translate/scale/matrix/rotate) into a
// single composed matrix. skewX/skewY and unrecognized functions are ignored.
export function parseTransform(str: string | null): Matrix {
  if (!str) return IDENTITY;
  let result = IDENTITY;
  const re = /(\w+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(str))) {
    const name = match[1];
    const args = (match[2].match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
    let m: Matrix | null = null;
    if (name === 'translate') {
      m = { a: 1, b: 0, c: 0, d: 1, e: args[0] || 0, f: args[1] || 0 };
    } else if (name === 'scale') {
      const sx = args[0] ?? 1;
      const sy = args.length > 1 ? args[1] : sx;
      m = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
    } else if (name === 'matrix' && args.length === 6) {
      m = { a: args[0], b: args[1], c: args[2], d: args[3], e: args[4], f: args[5] };
    } else if (name === 'rotate') {
      const rad = (args[0] || 0) * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const rot: Matrix = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
      if (args.length >= 3) {
        const cx = args[1], cy = args[2];
        m = multiplyMatrix(multiplyMatrix({ a: 1, b: 0, c: 0, d: 1, e: cx, f: cy }, rot), { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy });
      } else {
        m = rot;
      }
    }
    if (m) result = multiplyMatrix(result, m);
  }
  return result;
}

const getNums = (s: string): number[] => (s.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Path data parsing (with bezier flattening)
// ============================================================================

interface Subpath { points: Point[]; closed: boolean; }
interface ParsedPath { subpaths: Subpath[]; editable: boolean; }

// Parses a `d` attribute into flattened point lists per subpath.
// `editable` is true only if the path uses exclusively straight-line
// commands (M/L/H/V/Z) - curves and arcs are still flattened for accurate
// spacing *detection*, but are not eligible for automatic geometry edits.
export function parsePathD(d: string): ParsedPath {
  const tokens = d.match(/[MLHVZCSQTAmlhvzcsqta][^MLHVZCSQTAmlhvzcsqta]*/g) || [];
  const subpaths: Subpath[] = [];
  let current: Point[] = [];
  let cx = 0, cy = 0, startX = 0, startY = 0;
  let lastCtrl: Point | null = null;
  let editable = true;

  const closeSub = (closed: boolean) => {
    if (current.length) subpaths.push({ points: current, closed });
    current = [];
  };

  const flattenCubic = (p0: Point, p1: Point, p2: Point, p3: Point, segs = 12) => {
    for (let i = 1; i <= segs; i++) {
      const t = i / segs, mt = 1 - t;
      current.push({
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
      });
    }
  };
  const flattenQuad = (p0: Point, p1: Point, p2: Point, segs = 10) => {
    for (let i = 1; i <= segs; i++) {
      const t = i / segs, mt = 1 - t;
      current.push({
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      });
    }
  };

  for (const tok of tokens) {
    const type = tok[0];
    const rel = type === type.toLowerCase();
    const T = type.toUpperCase();
    const nums = getNums(tok.slice(1));
    if (T !== 'M' && T !== 'L' && T !== 'H' && T !== 'V' && T !== 'Z') editable = false;

    if (T === 'M') {
      for (let i = 0; i < nums.length; i += 2) {
        cx = rel ? cx + nums[i] : nums[i];
        cy = rel ? cy + nums[i + 1] : nums[i + 1];
        if (i === 0) { closeSub(false); startX = cx; startY = cy; }
        current.push({ x: cx, y: cy });
      }
    } else if (T === 'L') {
      for (let i = 0; i < nums.length; i += 2) {
        cx = rel ? cx + nums[i] : nums[i];
        cy = rel ? cy + nums[i + 1] : nums[i + 1];
        current.push({ x: cx, y: cy });
      }
    } else if (T === 'H') {
      nums.forEach(n => { cx = rel ? cx + n : n; current.push({ x: cx, y: cy }); });
    } else if (T === 'V') {
      nums.forEach(n => { cy = rel ? cy + n : n; current.push({ x: cx, y: cy }); });
    } else if (T === 'C') {
      for (let i = 0; i + 5 < nums.length; i += 6) {
        const p1 = { x: rel ? cx + nums[i] : nums[i], y: rel ? cy + nums[i + 1] : nums[i + 1] };
        const p2 = { x: rel ? cx + nums[i + 2] : nums[i + 2], y: rel ? cy + nums[i + 3] : nums[i + 3] };
        const p3 = { x: rel ? cx + nums[i + 4] : nums[i + 4], y: rel ? cy + nums[i + 5] : nums[i + 5] };
        flattenCubic({ x: cx, y: cy }, p1, p2, p3);
        lastCtrl = p2; cx = p3.x; cy = p3.y;
      }
    } else if (T === 'S') {
      for (let i = 0; i + 3 < nums.length; i += 4) {
        const p2 = { x: rel ? cx + nums[i] : nums[i], y: rel ? cy + nums[i + 1] : nums[i + 1] };
        const p3 = { x: rel ? cx + nums[i + 2] : nums[i + 2], y: rel ? cy + nums[i + 3] : nums[i + 3] };
        const p1 = lastCtrl ? { x: 2 * cx - lastCtrl.x, y: 2 * cy - lastCtrl.y } : { x: cx, y: cy };
        flattenCubic({ x: cx, y: cy }, p1, p2, p3);
        lastCtrl = p2; cx = p3.x; cy = p3.y;
      }
    } else if (T === 'Q') {
      for (let i = 0; i + 3 < nums.length; i += 4) {
        const p1 = { x: rel ? cx + nums[i] : nums[i], y: rel ? cy + nums[i + 1] : nums[i + 1] };
        const p2 = { x: rel ? cx + nums[i + 2] : nums[i + 2], y: rel ? cy + nums[i + 3] : nums[i + 3] };
        flattenQuad({ x: cx, y: cy }, p1, p2);
        lastCtrl = p1; cx = p2.x; cy = p2.y;
      }
    } else if (T === 'T') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const p2 = { x: rel ? cx + nums[i] : nums[i], y: rel ? cy + nums[i + 1] : nums[i + 1] };
        const p1: Point = lastCtrl ? { x: 2 * cx - lastCtrl.x, y: 2 * cy - lastCtrl.y } : { x: cx, y: cy };
        flattenQuad({ x: cx, y: cy }, p1, p2);
        lastCtrl = p1; cx = p2.x; cy = p2.y;
      }
    } else if (T === 'A') {
      // Arcs are approximated as a straight segment to their endpoint - not
      // geometrically accurate along the curve, but keeps the segment from
      // vanishing entirely. Arcs are never auto-fixable.
      if (nums.length >= 7) {
        cx = rel ? cx + nums[5] : nums[5];
        cy = rel ? cy + nums[6] : nums[6];
        current.push({ x: cx, y: cy });
      }
    } else if (T === 'Z') {
      cx = startX; cy = startY;
      closeSub(true);
      continue;
    }
    if (T !== 'C' && T !== 'S' && T !== 'Q' && T !== 'T') lastCtrl = null;
  }
  closeSub(false);
  return { subpaths, editable };
}

// ============================================================================
// Segment extraction (walks the SVG tree, applying transforms)
// ============================================================================

interface EditableGeom {
  kind: 'line' | 'polyline' | 'path';
  element: Element;
  invTransform: Matrix;
  localPoints: Point[];
  subpathLengths?: number[];
  subpathClosed?: boolean[];
}

interface SegmentInfo {
  start: Point;
  end: Point;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  element: Element;
  label: string;
  editable: boolean;
  geom?: EditableGeom;
  vStart?: number;
  vEnd?: number;
}

const NON_RENDERED_TAGS = new Set(['defs', 'symbol', 'clippath', 'mask', 'pattern', 'marker']);

function makeSegment(start: Point, end: Point, element: Element, label: string, editable: boolean, geom?: EditableGeom, vStart?: number, vEnd?: number): SegmentInfo {
  return {
    start, end,
    bbox: { minX: Math.min(start.x, end.x), maxX: Math.max(start.x, end.x), minY: Math.min(start.y, end.y), maxY: Math.max(start.y, end.y) },
    element, label, editable, geom, vStart, vEnd,
  };
}

function sampleEllipseGlobalPoints(cx: number, cy: number, rx: number, ry: number, transform: Matrix, samples: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * Math.PI * 2;
    pts.push(applyPoint(transform, { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) }));
  }
  return pts;
}

export function buildSegments(root: Element): { segments: SegmentInfo[] } {
  const segments: SegmentInfo[] = [];
  let lineCount = 0, polyCount = 0, pathCount = 0, circleCount = 0, ellipseCount = 0;

  function addOpenOrClosedRun(points: Point[], closed: boolean, element: Element, label: string, editable: boolean, geom?: EditableGeom, vertexOffset = 0) {
    const n = points.length;
    for (let i = 0; i < n - 1; i++) {
      segments.push(makeSegment(points[i], points[i + 1], element, label, editable, geom, editable ? vertexOffset + i : undefined, editable ? vertexOffset + i + 1 : undefined));
    }
    if (closed && n > 2) {
      segments.push(makeSegment(points[n - 1], points[0], element, label, editable, geom, editable ? vertexOffset + n - 1 : undefined, editable ? vertexOffset : undefined));
    }
  }

  function walk(el: Element, parentMatrix: Matrix) {
    const tag = el.tagName.toLowerCase();
    if (NON_RENDERED_TAGS.has(tag) || tag === 'use') return; // not directly rendered / not resolved (v1 limitation)

    const matrix = multiplyMatrix(parentMatrix, parseTransform(el.getAttribute('transform')));

    if (tag === 'line') {
      lineCount++;
      const x1 = parseFloat(el.getAttribute('x1') || '');
      const y1 = parseFloat(el.getAttribute('y1') || '');
      const x2 = parseFloat(el.getAttribute('x2') || '');
      const y2 = parseFloat(el.getAttribute('y2') || '');
      if ([x1, y1, x2, y2].every(n => !isNaN(n))) {
        const localPoints = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        const geom: EditableGeom = { kind: 'line', element: el, invTransform: invertMatrix(matrix), localPoints };
        segments.push(makeSegment(applyPoint(matrix, localPoints[0]), applyPoint(matrix, localPoints[1]), el, `line ${lineCount}`, true, geom, 0, 1));
      }
    } else if (tag === 'polyline' || tag === 'polygon') {
      polyCount++;
      const raw = el.getAttribute('points');
      if (raw) {
        const nums = getNums(raw);
        const localPoints: Point[] = [];
        for (let i = 0; i + 1 < nums.length; i += 2) localPoints.push({ x: nums[i], y: nums[i + 1] });
        if (localPoints.length >= 2) {
          const geom: EditableGeom = { kind: 'polyline', element: el, invTransform: invertMatrix(matrix), localPoints };
          const globalPoints = localPoints.map(p => applyPoint(matrix, p));
          addOpenOrClosedRun(globalPoints, tag === 'polygon', el, `${tag} ${polyCount}`, true, geom);
        }
      }
    } else if (tag === 'path') {
      pathCount++;
      const d = el.getAttribute('d');
      if (d) {
        const parsed = parsePathD(d);
        if (parsed.editable) {
          const flatPoints: Point[] = [];
          const subpathLengths: number[] = [];
          const subpathClosed: boolean[] = [];
          parsed.subpaths.forEach(sp => { subpathLengths.push(sp.points.length); subpathClosed.push(sp.closed); flatPoints.push(...sp.points); });
          const geom: EditableGeom = { kind: 'path', element: el, invTransform: invertMatrix(matrix), localPoints: flatPoints, subpathLengths, subpathClosed };
          let offset = 0;
          parsed.subpaths.forEach(sp => {
            const globalPoints = sp.points.map(p => applyPoint(matrix, p));
            addOpenOrClosedRun(globalPoints, sp.closed, el, `path ${pathCount}`, true, geom, offset);
            offset += sp.points.length;
          });
        } else {
          parsed.subpaths.forEach(sp => {
            const globalPoints = sp.points.map(p => applyPoint(matrix, p));
            addOpenOrClosedRun(globalPoints, sp.closed, el, `path ${pathCount}`, false);
          });
        }
      }
    } else if (tag === 'circle') {
      circleCount++;
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      if (r > 0) {
        const samples = Math.max(24, Math.min(72, Math.round(r * 6)));
        const pts = sampleEllipseGlobalPoints(cx, cy, r, r, matrix, samples);
        addOpenOrClosedRun(pts, true, el, `circle ${circleCount}`, false);
      }
    } else if (tag === 'ellipse') {
      ellipseCount++;
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const rx = parseFloat(el.getAttribute('rx') || '0');
      const ry = parseFloat(el.getAttribute('ry') || '0');
      if (rx > 0 && ry > 0) {
        const samples = Math.max(24, Math.min(72, Math.round(Math.max(rx, ry) * 6)));
        const pts = sampleEllipseGlobalPoints(cx, cy, rx, ry, matrix, samples);
        addOpenOrClosedRun(pts, true, el, `ellipse ${ellipseCount}`, false);
      }
    }

    for (let i = 0; i < el.children.length; i++) walk(el.children[i], matrix);
  }

  walk(root, IDENTITY);
  return { segments };
}

function writeGeomBack(geom: EditableGeom) {
  const el = geom.element;
  if (geom.kind === 'line') {
    el.setAttribute('x1', String(geom.localPoints[0].x));
    el.setAttribute('y1', String(geom.localPoints[0].y));
    el.setAttribute('x2', String(geom.localPoints[1].x));
    el.setAttribute('y2', String(geom.localPoints[1].y));
  } else if (geom.kind === 'polyline') {
    el.setAttribute('points', geom.localPoints.map(p => `${p.x},${p.y}`).join(' '));
  } else if (geom.kind === 'path') {
    let offset = 0;
    const parts: string[] = [];
    (geom.subpathLengths || []).forEach((len, si) => {
      const pts = geom.localPoints.slice(offset, offset + len);
      if (pts.length) {
        const closed = geom.subpathClosed && geom.subpathClosed[si];
        parts.push(`M ${pts[0].x},${pts[0].y}` + pts.slice(1).map(p => ` L ${p.x},${p.y}`).join('') + (closed ? ' Z' : ''));
      }
      offset += len;
    });
    el.setAttribute('d', parts.join(' '));
  }
}

// ============================================================================
// Spacing detection
// ============================================================================

interface Issue {
  distance: number;
  seg1Label: string;
  seg2Label: string;
  location: Point;
  segAIdx: number;
  segBIdx: number;
  editableA: boolean;
  editableB: boolean;
  tA: number; tB: number;
  dirX: number; dirY: number; // unit vector: push segment A along +dir, segment B along -dir
}

function pointToSegDistance(p: Point, a: Point, b: Point) {
  const A = p.x - a.x, B = p.y - a.y, C = b.x - a.x, D = b.y - a.y;
  const lenSq = C * C + D * D;
  let t = lenSq !== 0 ? (A * C + B * D) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const xx = a.x + t * C, yy = a.y + t * D;
  const dx = p.x - xx, dy = p.y - yy;
  return { distance: Math.hypot(dx, dy), t, dx, dy };
}

export async function detectIssues(
  segments: SegmentInfo[],
  threshold: number,
  maxComparisons: number,
  onProgress?: (frac: number, message: string) => void
): Promise<{ issues: Issue[]; comparisons: number; skipped: number }> {
  const issues: Issue[] = [];
  const bboxBuffer = threshold + 1;
  const totalPossible = Math.min((segments.length * (segments.length - 1)) / 2, maxComparisons);
  let comparisons = 0, skipped = 0;

  for (let i = 0; i < segments.length && comparisons < maxComparisons; i++) {
    const s1 = segments[i];
    for (let j = i + 1; j < segments.length && comparisons < maxComparisons; j++) {
      const s2 = segments[j];
      if (s1.element === s2.element) { skipped++; continue; }
      if (s1.bbox.maxX + bboxBuffer < s2.bbox.minX || s1.bbox.minX - bboxBuffer > s2.bbox.maxX ||
          s1.bbox.maxY + bboxBuffer < s2.bbox.minY || s1.bbox.minY - bboxBuffer > s2.bbox.maxY) {
        skipped++; continue;
      }
      comparisons++;

      const r1 = pointToSegDistance(s1.start, s2.start, s2.end); // point=s1.start, t is on seg2
      const r2 = pointToSegDistance(s1.end, s2.start, s2.end);   // point=s1.end,   t is on seg2
      const r3 = pointToSegDistance(s2.start, s1.start, s1.end); // point=s2.start, t is on seg1
      const r4 = pointToSegDistance(s2.end, s1.start, s1.end);   // point=s2.end,   t is on seg1

      // dir is defined so that pushing segment A (s1) along +dir and
      // segment B (s2) along -dir increases their separation.
      const candidates = [
        { d: r1.distance, tA: 0, tB: r1.t, dx: r1.dx, dy: r1.dy },
        { d: r2.distance, tA: 1, tB: r2.t, dx: r2.dx, dy: r2.dy },
        { d: r3.distance, tA: r3.t, tB: 0, dx: -r3.dx, dy: -r3.dy },
        { d: r4.distance, tA: r4.t, tB: 1, dx: -r4.dx, dy: -r4.dy },
      ];
      let best = candidates[0];
      for (const c of candidates) if (c.d < best.d) best = c;

      if (best.d < threshold && best.d > 1e-6) {
        // Segments that are parallel with overlapping projections (e.g. a
        // row of evenly-spaced hatch lines) tie exactly across all 4
        // candidates. Picking only the single "winning" candidate would
        // dump the whole push onto one endpoint and leave the other
        // untouched, un-parallelling the line. Average across every
        // near-tied candidate instead, so a symmetric conflict produces a
        // symmetric (rigid) push.
        const tieEps = Math.max(best.d * 0.01, 1e-6);
        let sumTA = 0, sumTB = 0, sumDX = 0, sumDY = 0, tiedCount = 0;
        for (const c of candidates) {
          if (c.d <= best.d + tieEps) { sumTA += c.tA; sumTB += c.tB; sumDX += c.dx; sumDY += c.dy; tiedCount++; }
        }
        const dirMag = Math.hypot(sumDX, sumDY) || best.d;
        issues.push({
          distance: best.d,
          seg1Label: s1.label, seg2Label: s2.label,
          location: { x: (s1.start.x + s1.end.x) / 2, y: (s1.start.y + s1.end.y) / 2 },
          segAIdx: i, segBIdx: j,
          editableA: s1.editable, editableB: s2.editable,
          tA: sumTA / tiedCount, tB: sumTB / tiedCount,
          dirX: sumDX / dirMag, dirY: sumDY / dirMag,
        });
      }
    }
    if (i % 50 === 0) {
      onProgress?.(comparisons / (totalPossible || 1), `Checked ${comparisons.toLocaleString()} pairs (${skipped.toLocaleString()} skipped)...`);
      await sleep(0);
    }
  }
  return { issues, comparisons, skipped };
}

// ============================================================================
// Auto-fix: iterative relaxation of editable geometry
// ============================================================================

function applyFixIteration(segments: SegmentInfo[], issues: Issue[], threshold: number): { movedElements: number; unresolved: number } {
  const acc = new Map<EditableGeom, { dx: number[]; dy: number[]; w: number[] }>();
  const ensure = (geom: EditableGeom) => {
    let e = acc.get(geom);
    if (!e) { e = { dx: new Array(geom.localPoints.length).fill(0), dy: new Array(geom.localPoints.length).fill(0), w: new Array(geom.localPoints.length).fill(0) }; acc.set(geom, e); }
    return e;
  };

  let unresolved = 0;
  const EPSILON = 0.02; // small extra margin so fixed pairs don't land exactly at the threshold

  for (const issue of issues) {
    const segA = segments[issue.segAIdx];
    const segB = segments[issue.segBIdx];
    if (!segA.editable && !segB.editable) { unresolved++; continue; }

    const needed = threshold - issue.distance + EPSILON;
    const pushEach = (segA.editable && segB.editable) ? needed / 2 : needed;

    if (segA.editable && segA.geom) {
      const e = ensure(segA.geom);
      const localPush = applyVector(segA.geom.invTransform, { x: issue.dirX * pushEach, y: issue.dirY * pushEach });
      const wStart = 1 - issue.tA, wEnd = issue.tA;
      if (wStart > 0) { e.dx[segA.vStart!] += localPush.x * wStart; e.dy[segA.vStart!] += localPush.y * wStart; e.w[segA.vStart!] += wStart; }
      if (wEnd > 0) { e.dx[segA.vEnd!] += localPush.x * wEnd; e.dy[segA.vEnd!] += localPush.y * wEnd; e.w[segA.vEnd!] += wEnd; }
    }
    if (segB.editable && segB.geom) {
      const e = ensure(segB.geom);
      const localPush = applyVector(segB.geom.invTransform, { x: -issue.dirX * pushEach, y: -issue.dirY * pushEach });
      const wStart = 1 - issue.tB, wEnd = issue.tB;
      if (wStart > 0) { e.dx[segB.vStart!] += localPush.x * wStart; e.dy[segB.vStart!] += localPush.y * wStart; e.w[segB.vStart!] += wStart; }
      if (wEnd > 0) { e.dx[segB.vEnd!] += localPush.x * wEnd; e.dy[segB.vEnd!] += localPush.y * wEnd; e.w[segB.vEnd!] += wEnd; }
    }
  }

  acc.forEach((e, geom) => {
    for (let i = 0; i < geom.localPoints.length; i++) {
      if (e.w[i] > 0) {
        geom.localPoints[i] = { x: geom.localPoints[i].x + e.dx[i] / e.w[i], y: geom.localPoints[i].y + e.dy[i] / e.w[i] };
      }
    }
  });
  acc.forEach((_e, geom) => writeGeomBack(geom));

  return { movedElements: acc.size, unresolved };
}

interface FixResult {
  fixedSvgString: string;
  before: number;
  after: number;
  iterationsRun: number;
  unresolvedNonEditable: number;
  finalIssues: Issue[];
}

async function autoFixSVG(
  svgString: string,
  threshold: number,
  maxComparisons: number,
  maxIterations: number,
  onProgress?: (frac: number, message: string) => void
): Promise<FixResult> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.documentElement;

  let before = 0;
  let iterationsRun = 0;
  let lastIssueCount = Infinity;

  for (let iter = 0; iter < maxIterations; iter++) {
    onProgress?.(iter / maxIterations, `Fix pass ${iter + 1}/${maxIterations}: checking spacing...`);
    await sleep(0);
    const { segments } = buildSegments(svg);
    const { issues } = await detectIssues(segments, threshold, maxComparisons, (frac, msg) => onProgress?.((iter + frac) / maxIterations, msg));
    if (iter === 0) before = groupIssuesByElementPair(issues).length;
    if (issues.length === 0) { iterationsRun = iter; break; }

    onProgress?.((iter + 0.9) / maxIterations, `Fix pass ${iter + 1}/${maxIterations}: adjusting ${issues.length} spot${issues.length === 1 ? '' : 's'}...`);
    await sleep(0);
    const { unresolved } = applyFixIteration(segments, issues, threshold);
    iterationsRun = iter + 1;

    // Stop early if nothing changed (every remaining issue is between two non-editable elements).
    if (unresolved === issues.length) break;
    if (issues.length >= lastIssueCount) { /* diminishing returns but keep going until maxIterations */ }
    lastIssueCount = issues.length;
  }

  onProgress?.(1, 'Verifying result...');
  await sleep(0);
  const { segments: finalSegments } = buildSegments(svg);
  const { issues: finalIssues } = await detectIssues(finalSegments, threshold, maxComparisons);
  const finalGrouped = groupIssuesByElementPair(finalIssues);
  const unresolvedNonEditable = finalGrouped.filter(g => !g.editableA && !g.editableB).length;

  const fixedSvgString = new XMLSerializer().serializeToString(svg);
  return { fixedSvgString, before, after: finalGrouped.length, iterationsRun, unresolvedNonEditable, finalIssues };
}

// ============================================================================
// Annotation (red markers) for preview / diagnostic export
// ============================================================================

function buildAnnotatedSVG(svgString: string, issues: Issue[], threshold: number): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.documentElement;

  const layer = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  layer.setAttribute('id', 'spacing-issues');
  layer.setAttribute('opacity', '0.7');

  issues.slice(0, 300).forEach(issue => {
    const { x, y } = issue.location;
    const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(x));
    circle.setAttribute('cy', String(y));
    circle.setAttribute('r', String(threshold * 2));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'red');
    circle.setAttribute('stroke-width', '0.2');
    layer.appendChild(circle);

    const l1 = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    l1.setAttribute('x1', String(x - threshold)); l1.setAttribute('y1', String(y));
    l1.setAttribute('x2', String(x + threshold)); l1.setAttribute('y2', String(y));
    l1.setAttribute('stroke', 'red'); l1.setAttribute('stroke-width', '0.1');
    layer.appendChild(l1);

    const l2 = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    l2.setAttribute('x1', String(x)); l2.setAttribute('y1', String(y - threshold));
    l2.setAttribute('x2', String(x)); l2.setAttribute('y2', String(y + threshold));
    l2.setAttribute('stroke', 'red'); l2.setAttribute('stroke-width', '0.1');
    layer.appendChild(l2);
  });

  svg.appendChild(layer);
  return new XMLSerializer().serializeToString(svg);
}

function fixabilityLabel(issue: { editableA: boolean; editableB: boolean }): string {
  if (issue.editableA && issue.editableB) return 'Auto-fixable';
  if (issue.editableA || issue.editableB) return 'Partial';
  return 'Manual only';
}

// Curved/circular elements are sampled into many short segments, so a single
// close pair of shapes (e.g. two concentric circles) shows up as dozens of
// near-duplicate per-sample issues. Group by element pair for display so the
// count and table reflect "how many shapes conflict", not "how many sample
// points conflict" - the raw per-sample issues are still what auto-fix
// operates on internally.
interface GroupedIssue {
  seg1Label: string;
  seg2Label: string;
  distance: number;
  count: number;
  location: Point;
  editableA: boolean;
  editableB: boolean;
}

function groupIssuesByElementPair(issues: Issue[]): GroupedIssue[] {
  const map = new Map<string, GroupedIssue>();
  for (const issue of issues) {
    const [labelA, labelB] = [issue.seg1Label, issue.seg2Label].sort();
    const key = `${labelA}|${labelB}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        seg1Label: labelA, seg2Label: labelB,
        distance: issue.distance, count: 1,
        location: issue.location,
        editableA: issue.editableA, editableB: issue.editableB,
      });
    } else {
      existing.count++;
      if (issue.distance < existing.distance) {
        existing.distance = issue.distance;
        existing.location = issue.location;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.distance - b.distance);
}

// ============================================================================
// Component
// ============================================================================

export default function SVGSpacingAnalyzer() {
  const [svgContent, setSvgContent] = useState('');
  const [analyzedSVG, setAnalyzedSVG] = useState('');
  const [threshold, setThreshold] = useState(0.5);
  const [issues, setIssues] = useState<GroupedIssue[]>([]);
  const [totalIssueCount, setTotalIssueCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [maxComparisons, setMaxComparisons] = useState(1000000);
  const [fixing, setFixing] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);
  const [fixMessage, setFixMessage] = useState('');
  const [fixSummary, setFixSummary] = useState<{ before: number; after: number; iterations: number; unresolvedNonEditable: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeSVG = async () => {
    if (!svgContent) return;

    setAnalyzing(true);
    setIssues([]);
    setProgress(0);
    setProgressMessage('Parsing SVG...');
    await sleep(30);

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) throw new Error('The file is not valid SVG/XML.');
      const svg = doc.documentElement;

      setProgressMessage('Extracting elements...');
      setProgress(10);
      await sleep(10);

      const { segments } = buildSegments(svg);

      setProgressMessage(`Analyzing ${segments.length.toLocaleString()} segments...`);
      setProgress(20);
      await sleep(10);

      const { issues: foundIssues, comparisons } = await detectIssues(segments, threshold, maxComparisons, (frac, msg) => {
        setProgress(20 + frac * 70);
        setProgressMessage(msg);
      });

      setProgressMessage('Creating annotated preview...');
      setProgress(95);
      await sleep(10);

      const grouped = groupIssuesByElementPair(foundIssues);
      setIssues(grouped.slice(0, 100));
      setTotalIssueCount(grouped.length);
      setAnalyzedSVG(buildAnnotatedSVG(svgContent, foundIssues, threshold));
      setFixSummary(null);

      setProgress(100);
      setProgressMessage(comparisons >= maxComparisons ? `Complete (limited to ${maxComparisons.toLocaleString()} comparisons)` : 'Complete!');
    } catch (error) {
      console.error('Error analyzing SVG:', error);
      alert('Error analyzing SVG: ' + (error instanceof Error ? error.message : String(error)));
    }

    setAnalyzing(false);
  };

  const handleAutoFix = async () => {
    if (!svgContent) return;

    setFixing(true);
    setFixProgress(0);
    setFixMessage('Starting auto-fix...');
    await sleep(30);

    try {
      const result = await autoFixSVG(svgContent, threshold, maxComparisons, 3, (frac, msg) => {
        setFixProgress(frac * 100);
        setFixMessage(msg);
      });

      const grouped = groupIssuesByElementPair(result.finalIssues);
      setSvgContent(result.fixedSvgString);
      setIssues(grouped.slice(0, 100));
      setTotalIssueCount(grouped.length);
      setAnalyzedSVG(buildAnnotatedSVG(result.fixedSvgString, result.finalIssues, threshold));
      setFixSummary({ before: result.before, after: result.after, iterations: result.iterationsRun, unresolvedNonEditable: result.unresolvedNonEditable });
      setFixProgress(100);
      setFixMessage(`Done: ${result.before} → ${result.after} issue${result.after === 1 ? '' : 's'} remaining after ${result.iterationsRun} pass${result.iterationsRun === 1 ? '' : 'es'}.`);
    } catch (error) {
      console.error('Error auto-fixing SVG:', error);
      alert('Error auto-fixing SVG: ' + (error instanceof Error ? error.message : String(error)));
    }

    setFixing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = typeof event.target?.result === 'string' ? event.target.result : '';
        setSvgContent(text);
        setAnalyzedSVG('');
        setIssues([]);
        setTotalIssueCount(0);
        setFixSummary(null);
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

  const downloadFixedSVG = () => {
    if (!svgContent || !fixSummary) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spacing-fixed.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const busy = analyzing || fixing;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">SVG Line Spacing Analyzer</h1>
        <p className="text-gray-600 mb-6">Find lines that are too close together in your plotter drawings, and auto-fix the ones that can be safely spread apart</p>

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
                  onClick={() => fileInputRef.current?.click()}
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
                  Higher = more accurate but slower (applies per fix pass too)
                </p>
              </div>

              <button
                onClick={analyzeSVG}
                disabled={!svgContent || busy}
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

              {issues.length > 0 && !analyzing && (
                <button
                  onClick={handleAutoFix}
                  disabled={busy}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  {fixing ? 'Fixing...' : 'Auto-Fix Close Lines'}
                </button>
              )}

              {fixing && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${fixProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 text-center">{fixMessage}</p>
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

              {fixSummary && (
                <button
                  onClick={downloadFixedSVG}
                  className="w-full bg-emerald-600 text-white py-2 px-4 rounded hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Fixed SVG (clean)
                </button>
              )}
            </div>

            {/* Fix Summary */}
            {fixSummary && (
              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-800">Auto-Fix Result</h3>
                </div>
                <p className="text-sm text-purple-700">
                  {fixSummary.before} → {fixSummary.after} issues after {fixSummary.iterations} pass{fixSummary.iterations === 1 ? '' : 'es'}.
                </p>
                {fixSummary.unresolvedNonEditable > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    {fixSummary.unresolvedNonEditable} issue{fixSummary.unresolvedNonEditable === 1 ? '' : 's'} involve circles, curves, or arcs and were not auto-edited — review these manually. You can click Auto-Fix again to run more passes.
                  </p>
                )}
              </div>
            )}

            {/* Results Summary */}
            {issues.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">
                    {totalIssueCount.toLocaleString()} Issue{totalIssueCount === 1 ? '' : 's'} Found
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
                        <th className="p-2 text-left">Closest Distance</th>
                        <th className="p-2 text-left">Element 1</th>
                        <th className="p-2 text-left">Element 2</th>
                        <th className="p-2 text-left">Location</th>
                        <th className="p-2 text-left">Samples</th>
                        <th className="p-2 text-left">Fixable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-red-600">{issue.distance.toFixed(3)}mm</td>
                          <td className="p-2">{issue.seg1Label}</td>
                          <td className="p-2">{issue.seg2Label}</td>
                          <td className="p-2 font-mono text-xs">({issue.location.x.toFixed(1)}, {issue.location.y.toFixed(1)})</td>
                          <td className="p-2 text-xs text-gray-500">{issue.count > 1 ? `× ${issue.count}` : '—'}</td>
                          <td className="p-2 text-xs">{fixabilityLabel(issue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalIssueCount > issues.length && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      Showing first {issues.length} of {totalIssueCount.toLocaleString()} issues...
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
