# Spec: Middle-school and High-school Drawing Expansion

## Objective
Extend the single-file geometry board for classroom sketching with exact right triangles, quadratic graphs, visible equations, rotation controls, iPad drawing, and macOS/Windows shortcuts.

## Tech Stack
Single HTML/CSS/JavaScript canvas application. No new dependencies.

## Commands
- Test: `node --test tests/geometry_ux_regression_test.js`
- Syntax: `node scripts/check-syntax.js`
- Browser: `python3 -m http.server 8765`

## Project Structure
- `index.html`: application, object model, canvas renderer, interactions.
- `tests/geometry_ux_regression_test.js`: pure geometry and static UI regression tests.

## Code Style
```js
function quadraticValue(a, b, c, x) {
  return a * x * x + b * x + c;
}
```
Keep geometry calculations pure; keep screen conversion in renderer functions.

## Testing Strategy
Pure tests cover equation formatting, exact perpendicular construction, shortcut normalization, and rotation. Browser tests cover dialogs, canvas rendering, responsive touch layout, and console errors.

## Boundaries
- Always: preserve existing object JSON, undo/redo, search, and deterministic geometry.
- Ask first: external graphing libraries, cloud persistence, symbolic algebra.
- Never: execute AI-generated geometry code directly or hide core tools on iPad.

## Success Criteria
- Quadratic coefficients create a graph aligned to an existing coordinate system; otherwise a coordinate system is created automatically.
- The graph displays a readable `y = ax² + bx + c` equation.
- Three clicks create a triangle whose first vertex is exactly 90 degrees.
- Selected geometric objects rotate by +/-15 degrees from visible controls.
- macOS Command and Windows Control copy/paste/undo/redo/select-all shortcuts work without affecting active inputs.
- Apple Pencil and single-touch input can drive existing canvas drawing; controls remain usable on iPad widths.

## Follow-up Candidates
Isosceles/equilateral triangles, parallelogram/trapezoid, linear functions, inverse proportional functions, sine/cosine graphs, and geometric loci.
