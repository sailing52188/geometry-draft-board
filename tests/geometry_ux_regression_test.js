const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8'
);

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const braceStart = html.indexOf('{\n', start);
  let depth = 0;
  for (let i = braceStart; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function smartSnap(objects, wx, wy, options) {
  const context = {
    Math,
    ST: { objects, snapOn: true },
    vp: { panX: 0, panY: 0, scale: 1 },
    SNAP_R: 10,
    GRID: 40,
    w2s: p => p,
  };
  vm.createContext(context);
  vm.runInContext(extractFunction('dist'), context);
  vm.runInContext(extractFunction('angle'), context);
  vm.runInContext(extractFunction('midPt'), context);
  vm.runInContext(extractFunction('evaluateFunctionDescriptor'), context);
  vm.runInContext(extractFunction('nearestPointOnExplicitDescriptor'), context);
  vm.runInContext(extractFunction('getObjectSnapCandidate'), context);
  vm.runInContext(extractFunction('getGeometryEdges'), context);
  vm.runInContext(extractFunction('getSmartSnapPoints'), context);
  vm.runInContext(extractFunction('computeSmartSnap'), context);
  return vm.runInContext(
    `computeSmartSnap(${wx}, ${wy}, ${JSON.stringify(options)})`,
    context
  );
}

function constructionCall(expression) {
  const context = { Math, GRID: 40 };
  vm.createContext(context);
  vm.runInContext(extractFunction('dist'), context);
  vm.runInContext(extractFunction('angle'), context);
  vm.runInContext(extractFunction('midPt'), context);
  vm.runInContext(extractFunction('projectPointToLine'), context);
  vm.runInContext(extractFunction('constructionLine'), context);
  vm.runInContext(extractFunction('createParallelThrough'), context);
  vm.runInContext(extractFunction('createPerpendicularThrough'), context);
  vm.runInContext(extractFunction('createPerpendicularBisector'), context);
  vm.runInContext(extractFunction('createTriangleAltitude'), context);
  return vm.runInContext(expression, context);
}

test('smart snap distinguishes endpoints and midpoints', () => {
  const segment = { type: 'segment', p1: { x: 0, y: 0 }, p2: { x: 80, y: 0 } };
  assert.equal(smartSnap([segment], 2, 1, { start: null }).relation, 'endpoint');
  assert.equal(smartSnap([segment], 41, 1, { start: null }).relation, 'midpoint');
});

test('smart snap proposes parallel, perpendicular and equal relations', () => {
  const segment = { type: 'segment', p1: { x: 200, y: 200 }, p2: { x: 320, y: 200 } };
  const start = { x: 0, y: 0 };
  assert.equal(smartSnap([segment], 83, 3, { start }).relation, 'parallel');
  assert.equal(smartSnap([segment], 3, 83, { start }).relation, 'perpendicular');
  assert.equal(smartSnap([segment], 118, 6, { start }).secondaryRelation, 'equal');
});

test('coordinate snap projects drawing points onto axes and function curves', () => {
  const context={Math};vm.createContext(context);
  for(const name of ['evaluateFunctionDescriptor','nearestPointOnExplicitDescriptor','getObjectSnapCandidate']){
    vm.runInContext(extractFunction(name),context);
  }
  const axis={type:'axes',origin:{x:0,y:0},scale:40};
  const xAxis=vm.runInContext("getObjectSnapCandidate({type:'axes',origin:{x:0,y:0},scale:40},{x:80,y:3},null)",context);
  const curve=vm.runInContext("getObjectSnapCandidate({type:'quadratic',a:1,b:0,c:0},{x:42,y:-43},"+JSON.stringify(axis)+")",context);
  const circle=vm.runInContext("getObjectSnapCandidate({type:'circle',center:{x:0,y:0},radius:40},{x:39,y:5},null)",context);
  assert.equal(xAxis.relation,'axis-x');
  assert.equal(xAxis.y,0);
  assert.equal(curve.relation,'function-curve');
  assert.ok(Math.abs(curve.y+(curve.x/40)**2*40)<1e-6);
  assert.ok(Math.hypot(curve.x-42,curve.y+43)<2);
  assert.equal(circle.relation,'circumference');
  assert.ok(Math.abs(Math.hypot(circle.x,circle.y)-40)<1e-9);
});

test('axis integer ticks snap and coordinate entry converts exact points', () => {
  const context={Math};vm.createContext(context);
  vm.runInContext(extractFunction('getAxisIntegerSnapCandidates'),context);
  vm.runInContext(extractFunction('coordinatePointToWorld'),context);
  vm.runInContext(extractFunction('worldPointToCoordinate'),context);
  const ticks=vm.runInContext("getAxisIntegerSnapCandidates({origin:{x:0,y:0},scale:40},{x:81,y:4})",context);
  const xTick=Array.from(ticks).find(p=>p.relation==='axis-integer-x');
  assert.deepEqual({x:xTick.x,y:xTick.y,value:xTick.value},{x:80,y:0,value:2});
  const world=vm.runInContext("coordinatePointToWorld({origin:{x:100,y:200},scale:50},2,-3)",context);
  assert.deepEqual({x:world.x,y:world.y},{x:200,y:350});
  const math=vm.runInContext("worldPointToCoordinate({origin:{x:100,y:200},scale:50},{x:200,y:350})",context);
  assert.deepEqual({x:math.x,y:math.y},{x:2,y:-3});
});

test('point-based drawing exposes a reusable exact coordinate entry', () => {
  for(const id of ['coordinate-entry','coordinate-x','coordinate-y','coordinate-add']){
    assert.match(html,new RegExp(`id="${id}"`));
  }
  assert.match(html,/inputmode="decimal"/);
  assert.match(html,/const COORDINATE_POINT_TOOLS = new Set\(\[/);
  assert.match(html,/coordinateEntry\.classList\.toggle\('show',showCoordinateEntry\)/);
});

test('canvas exposes an accessible relation HUD and dynamic input', () => {
  assert.match(html, /id="relation-hud"[^>]*aria-live="polite"/);
  assert.match(html, /id="dynamic-input"/);
  assert.match(html, /id="dynamic-length"/);
  assert.match(html, /id="dynamic-angle"/);
});

test('grid spacing adapts to zoom while staying readable', () => {
  const context = { Math };
  vm.createContext(context);
  vm.runInContext(extractFunction('getAdaptiveGridSpacing'), context);

  const normal = vm.runInContext('getAdaptiveGridSpacing(1, 40, 36)', context);
  const zoomedOut = vm.runInContext('getAdaptiveGridSpacing(0.25, 40, 36)', context);
  const zoomedIn = vm.runInContext('getAdaptiveGridSpacing(2, 40, 36)', context);
  assert.deepEqual({world: normal.worldStep, pixels: normal.pixelStep}, {world: 40, pixels: 40});
  assert.deepEqual({world: zoomedOut.worldStep, pixels: zoomedOut.pixelStep}, {world: 200, pixels: 50});
  assert.deepEqual({world: zoomedIn.worldStep, pixels: zoomedIn.pixelStep}, {world: 20, pixels: 40});
});

test('axis labels skip ticks when zoomed out', () => {
  const context = { Math };
  vm.createContext(context);
  vm.runInContext(extractFunction('getAxisLabelStride'), context);
  assert.equal(vm.runInContext('getAxisLabelStride(40)', context), 1);
  assert.equal(vm.runInContext('getAxisLabelStride(10)', context), 5);
  assert.equal(vm.runInContext('getAxisLabelStride(5)', context), 10);
});

test('axes use viewport-adaptive ticks and return to selection after creation', () => {
  assert.doesNotMatch(html, /id="ad-ticks"/);
  assert.doesNotMatch(extractFunction('drawAxes'), /obj\.ticks/);
  assert.match(html, /ST\.objects\.push\(\{ type: 'axes'[\s\S]*?setTool\('select'\)/);
});

test('quadratic functions evaluate and format classroom equations', () => {
  const context = { Math };
  vm.createContext(context);
  vm.runInContext(extractFunction('quadraticValue'), context);
  vm.runInContext(extractFunction('formatQuadraticEquation'), context);
  assert.equal(vm.runInContext('quadraticValue(2, -3, 1, 4)', context), 21);
  assert.equal(vm.runInContext('formatQuadraticEquation(1, -4, 3)', context), 'y = x² - 4x + 3');
  assert.equal(vm.runInContext('formatQuadraticEquation(-1, 0, 4)', context), 'y = -x² + 4');
  assert.equal(vm.runInContext('formatQuadraticEquation(2, 1, -1)', context), 'y = 2x² + x - 1');
});

test('coordinate objects format line circle ellipse and classroom function equations', () => {
  const context = { Math };
  vm.createContext(context);
  vm.runInContext(extractFunction('formatNumber'), context);
  vm.runInContext(extractFunction('formatCoordinateEquation'), context);
  assert.equal(vm.runInContext("formatCoordinateEquation({kind:'line',m:2,b:-3})", context), 'y = 2x - 3');
  assert.equal(vm.runInContext("formatCoordinateEquation({kind:'line',vertical:true,x:4})", context), 'x = 4');
  assert.equal(vm.runInContext("formatCoordinateEquation({kind:'circle',h:-2,k:3,r:5})", context), '(x + 2)² + (y - 3)² = 25');
  assert.equal(vm.runInContext("formatCoordinateEquation({kind:'ellipse',h:0,k:0,a:4,b:2})", context), 'x² / 16 + y² / 4 = 1');
  assert.equal(vm.runInContext("formatCoordinateEquation({kind:'sine',a:2,b:1,h:0,k:-1})", context), 'y = 2sin(x) - 1');
});

test('local intersection solver rejects AI hallucinated roots and finds real roots', () => {
  const context = { Math };
  vm.createContext(context);
  vm.runInContext(extractFunction('evaluateFunctionDescriptor'), context);
  vm.runInContext(extractFunction('bisectRoot'), context);
  vm.runInContext(extractFunction('findFunctionIntersections'), context);
  const none=vm.runInContext("findFunctionIntersections({kind:'quadratic',a:1,b:0,c:0},{kind:'quadratic',a:-1,b:3,c:-2},-10,10)", context);
  const roots=vm.runInContext("findFunctionIntersections({kind:'quadratic',a:1,b:0,c:0},{kind:'line',m:1,b:0},-3,3)", context);
  assert.equal(none.length,0);
  assert.deepEqual(Array.from(roots,p=>Number(p.x.toFixed(5))),[0,1]);
});

test('AI coordinate claims are filtered before locally verified intersections render', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(extractFunction('isAICoordinateClaim'), context);
  assert.equal(vm.runInContext("isAICoordinateClaim({type:'label',text:'(1,1)'})",context),true);
  assert.equal(vm.runInContext("isAICoordinateClaim({type:'label',text:'顶点A'})",context),false);
});

test('implicit circle and ellipse intersections are also solved locally', () => {
  const context={Math};vm.createContext(context);
  for(const name of ['evaluateFunctionDescriptor','bisectRoot','findFunctionIntersections','descriptorIsExplicit','implicitResidual','findCoordinatePairIntersections']){
    vm.runInContext(extractFunction(name),context);
  }
  const points=vm.runInContext("findCoordinatePairIntersections({kind:'circle',h:0,k:0,r:2},{kind:'ellipse',h:0,k:0,a:3,b:1.5},-5,5)",context);
  assert.equal(points.length,4);
  const vertical=vm.runInContext("findCoordinatePairIntersections({kind:'line',vertical:true,x:1},{kind:'circle',h:0,k:0,r:2},-5,5)",context);
  assert.equal(vertical.length,2);
});

test('function and intersection controls stay visible and AI chat text is selectable', () => {
  for (const id of ['btn-show-equations','btn-show-intersections']) assert.match(html,new RegExp(`id="${id}"`));
  for (const kind of ['sine','cosine','ellipse','hyperbola']) assert.match(html,new RegExp(`data-function-kind="${kind}"`));
  assert.match(html,/\.ai-msg\s*\{[^}]*user-select:\s*text/);
});

test('quadratic drawing is directly available with a coefficient dialog', () => {
  assert.match(html, /data-tool="quadratic"/);
  assert.match(html, /id="quadratic-dialog"/);
  for (const id of ['quad-a', 'quad-b', 'quad-c', 'quad-ok']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(extractFunction('drawObj'), /case 'quadratic':\s*drawQuadratic\(obj\)/);
});

test('right triangle tool projects the third point to an exact perpendicular', () => {
  const context = { Math };
  vm.createContext(context);
  vm.runInContext(extractFunction('projectRightTrianglePoint'), context);
  const point = vm.runInContext(
    'projectRightTrianglePoint({x:10,y:20},{x:90,y:50},{x:25,y:120})',
    context
  );
  const base = { x: 80, y: 30 };
  const leg = { x: point.x - 10, y: point.y - 20 };
  assert.ok(Math.abs(base.x * leg.x + base.y * leg.y) < 1e-9);
  assert.match(html, /data-tool="right-triangle"/);
  assert.match(extractFunction('drawObj'), /rightAngleIndex/);
});

test('keyboard accelerators normalize macOS and Windows editing shortcuts', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(extractFunction('getAcceleratorAction'), context);
  assert.equal(vm.runInContext("getAcceleratorAction({key:'c',metaKey:true,ctrlKey:false,shiftKey:false})", context), 'copy');
  assert.equal(vm.runInContext("getAcceleratorAction({key:'v',metaKey:false,ctrlKey:true,shiftKey:false})", context), 'paste');
  assert.equal(vm.runInContext("getAcceleratorAction({key:'z',metaKey:true,ctrlKey:false,shiftKey:true})", context), 'redo');
  assert.equal(vm.runInContext("getAcceleratorAction({key:'y',metaKey:false,ctrlKey:true,shiftKey:false})", context), 'redo');
});

test('rotation actions are visible and iPad pointers have a dedicated input path', () => {
  assert.match(html, /id="btn-rotate-left"/);
  assert.match(html, /id="btn-rotate-right"/);
  assert.match(html, /touch-action:\s*none/);
  assert.match(html, /pointerdown/);
  assert.match(html, /setPointerCapture/);
  assert.match(html, /@media\s*\(pointer:\s*coarse\)/);
});

test('deterministic construction creates exact parallel and perpendicular lines', () => {
  const edge = JSON.stringify({ a: { x: 0, y: 0 }, b: { x: 100, y: 0 } });
  const parallel = constructionCall(`createParallelThrough(${edge}, {x:20,y:40})`);
  const perpendicular = constructionCall(`createPerpendicularThrough(${edge}, {x:20,y:40})`);
  assert.ok(Math.abs(parallel.p1.y - parallel.p2.y) < 1e-9);
  assert.ok(Math.abs(perpendicular.p1.x - perpendicular.p2.x) < 1e-9);
});

test('perpendicular bisector passes through midpoint and triangle altitude reaches opposite side', () => {
  const edge = JSON.stringify({ a: { x: 0, y: 0 }, b: { x: 80, y: 0 } });
  const bisector = constructionCall(`createPerpendicularBisector(${edge})`);
  assert.equal(bisector[0].pos.x, 40);
  assert.equal(bisector[0].pos.y, 0);
  assert.ok(Math.abs(bisector[1].p1.x - 40) < 1e-9);

  const triangle = JSON.stringify({
    type: 'triangle',
    pts: [{ x: 20, y: 0 }, { x: 0, y: 80 }, { x: 100, y: 80 }]
  });
  const altitude = constructionCall(`createTriangleAltitude(${triangle}, 0)`);
  assert.ok(Math.abs(altitude.p2.y - 80) < 1e-9);
  assert.ok(Math.abs(altitude.p2.x - 20) < 1e-9);
});

test('selection geometry toolbar exposes common middle-school constructions', () => {
  assert.match(html, /id="geometry-actions"/);
  for (const action of ['midpoint', 'parallel', 'perpendicular', 'perpendicular-bisector', 'altitude', 'median']) {
    assert.match(html, new RegExp(`data-construct="${action}"`));
  }
});

test('permanent command docks expose all command categories without a toolbox gate', () => {
  assert.match(html, /id="btn-more-controls"/);
  assert.match(html, /id="left-command-rail"/);
  assert.match(html, /id="right-command-rail"/);
  assert.match(html, /class="rail-group"[^>]*aria-label="基础操作"/);
  assert.match(html, /class="rail-group"[^>]*aria-label="几何构造"/);
  assert.match(html, /class="rail-group"[^>]*aria-label="编辑"/);
  assert.match(html, /class="rail-group"[^>]*aria-label="视图"/);
  assert.match(html, /class="tg"[^>]*data-label="输出"/);
  assert.doesNotMatch(html, /id="btn-command"/);
  assert.doesNotMatch(html, /\.tb-tool\[data-tool="ray"\][\s\S]*?display:none/);
  for (const action of ['midpoint', 'parallel', 'perpendicular', 'perpendicular-bisector', 'altitude', 'median', 'angle-bisector']) {
    assert.match(html, new RegExp(`id="left-command-rail"[\\s\\S]*?data-construct="${action}"`));
  }
});

test('slash search remains available as an accelerator', () => {
  assert.match(html, /id="command-palette"/);
  assert.match(html, /id="command-search"/);
  assert.match(html, /id="command-results"/);
});

test('narrow desktop keeps top command groups visible by wrapping them', () => {
  assert.match(html, /@media\s*\(max-width:\s*1200px\)[\s\S]*?#tool-scroll\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(html, /@media\s*\(max-width:\s*1200px\)[\s\S]*?#tool-scroll\s*\{[^}]*overflow-x:\s*hidden/);
  assert.doesNotMatch(html, /#btn-help[^\{]*\{[^}]*display:\s*none/);
});

test('commands are grouped in a stable category order', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(extractFunction('groupCommandsByCategory'), context);
  const groups = vm.runInContext(`groupCommandsByCategory(
    [
      {id:'line', category:'draw'},
      {id:'undo', category:'basic'},
      {id:'circle', category:'draw'}
    ],
    [
      {id:'basic', label:'基础操作'},
      {id:'draw', label:'线与图形'},
      {id:'view', label:'视图与输出'}
    ]
  )`, context);

  assert.deepEqual(Array.from(groups, group => group.id), ['basic', 'draw']);
  assert.deepEqual(Array.from(groups[1].commands, command => command.id), ['line', 'circle']);
});

test('command palette exposes every command in categorized responsive groups', () => {
  const context = {
    ST: { selected: [] },
    setTool() {}, startConstructionAction() {}, undo() {}, redo() {},
    document: { getElementById: () => ({ click() {} }) }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction('getCommandIcon'), context);
  vm.runInContext(extractFunction('getCommandCatalog'), context);
  const catalog = vm.runInContext('getCommandCatalog()', context);
  const categories = new Set(Array.from(catalog, command => command.category));
  assert.ok(Array.from(catalog).every(command => Boolean(command.category)));
  assert.deepEqual(
    ['basic', 'draw', 'annotate', 'construct', 'edit', 'view'].filter(category => categories.has(category)),
    ['basic', 'draw', 'annotate', 'construct', 'edit', 'view']
  );
  assert.doesNotMatch(html, /\.slice\(0,\s*14\)/);
  assert.match(html, /\.command-groups\s*\{/);
  assert.match(html, /\.command-group-title\s*\{/);
  assert.match(html, /\.command-groups\s*\{[^}]*column-count:\s*2/);
  assert.match(html, /@media\s*\(max-width:\s*700px\)[^{]*\{[\s\S]*?\.command-groups\s*\{[\s\S]*?column-count:\s*1/);
});

test('every searchable command has a visible icon', () => {
  const context = {
    ST: { selected: [] },
    setTool() {}, startConstructionAction() {}, undo() {}, redo() {},
    document: { getElementById: () => ({ click() {} }) }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction('getCommandIcon'), context);
  vm.runInContext(extractFunction('getCommandCatalog'), context);
  const catalog = vm.runInContext('getCommandCatalog()', context);

  assert.equal(catalog.length, 49);
  assert.ok(Array.from(catalog).every(command => typeof command.icon === 'string' && command.icon.trim()));
  assert.match(html, /className='command-icon'/);
});

test('AI intent parser maps Chinese geometry requests to deterministic operations', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(extractFunction('parseGeometryIntent'), context);
  assert.equal(vm.runInContext("parseGeometryIntent('作这条线段的中点')", context), 'midpoint');
  assert.equal(vm.runInContext("parseGeometryIntent('画垂直平分线')", context), 'perpendicular-bisector');
  assert.equal(vm.runInContext("parseGeometryIntent('从A点作高')", context), 'altitude');
  assert.equal(vm.runInContext("parseGeometryIntent('作角平分线')", context), 'angle-bisector');
});

test('AI scene context includes current selection and structured objects', () => {
  const context = {
    ST: { objects: [
      { type: 'segment', p1: {x:0,y:0}, p2: {x:40,y:0} },
      { type: 'quadratic', a:1, b:-2, c:-3 }
    ], selected: [0] },
    GRID: 40,
  };
  vm.createContext(context);
  vm.runInContext(extractFunction('formatQuadraticEquation'), context);
  vm.runInContext(extractFunction('buildAISceneContext'), context);
  const scene = vm.runInContext('buildAISceneContext()', context);
  assert.equal(scene.selectedIndices[0], 0);
  assert.equal(scene.objects[0].type, 'segment');
  assert.deepEqual(
    {a:scene.objects[1].a,b:scene.objects[1].b,c:scene.objects[1].c},
    {a:1,b:-2,c:-3}
  );
});
