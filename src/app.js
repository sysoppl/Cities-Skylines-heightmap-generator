// <reference path='https://api.tiles.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js' />

'use strict'

const defaultWaterdepth = 40;

// see: https://www.taylorpetrick.com/blog/post/convolution-part3
const meanKernel = [ 
    [1, 1, 1], 
    [1, 1, 1], 
    [1, 1, 1] 
]; 

const sharpenKernel = [ 
    [-0.00391, -0.01563, -0.02344, -0.01563, -0.00391], 
    [-0.01563, -0.06250, -0.09375, -0.06250, -0.01563],
    [-0.02344, -0.09375, +1.85980, -0.09375, -0.02344], 
    [-0.01563, -0.06250, -0.09375, -0.06250, -0.01563],
    [-0.00391, -0.01563, -0.02344, -0.01563, -0.00391] 
]; 

var vmapSize = 18.144;
var mapSize = 17.28;
var tileSize = 1.92;

var grid = loadSettings();

var mapCanvas;

var cache;

var panels = document.getElementsByClassName('panel');
var icons = document.getElementsByClassName('icon');
var iconClass = [];

for (let i = 0; i < panels.length; i++) {
    iconClass.push(icons[i].className);
}

let debug = !!new URL(window.location.href).searchParams.get('debug');
let debugElements = document.getElementsByClassName('debug');
if (debug) while (debugElements.length > 0) {
    debugElements[0].classList.remove('debug');
}

// MapBox API token, temperate email for dev
// Go to https://account.mapbox.com/auth/signup/ to apply a new api key
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVydGRldm4iLCJhIjoiY2t2dXF1ZGhyMHlteTJ2bzJjZzE3M24xOCJ9.J5skknTRyh-6RoDWD4kw2w';

var map = new mapboxgl.Map({
    container: 'map',                               // Specify the container ID
    style: 'mapbox://styles/mapbox/outdoors-v12',   // Specify which map style to use
    //style: 'mapbox://styles/mapbox/streets-v12',  // Specify which map style to use
    center: [grid.lng, grid.lat],                   // Specify the starting position [lng, lat]
    zoom: grid.zoom,                                // Specify the starting zoom
    preserveDrawingBuffer: true
});

var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false
});

const pbElement = document.getElementById('progress');

document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

map.on('load', function () {
    mapCanvas = map.getCanvasContainer();

    scope.mapSize = mapSize;
    scope.baseLevel = 0;
    scope.heightScale = 100;

    caches.open('tiles').then((data) => cache = data);
});

map.on('style.load', function () {
    addSource();
    addLayer();
    setDebug();

    setMouse();

    showWaterLayer();
    showHeightLayer();
});

map.on('click', function (e) {
    grid.lng = e.lngLat.lng;
    grid.lat = e.lngLat.lat;

    setGrid(grid.lng, grid.lat, vmapSize);
    map.panTo(new mapboxgl.LngLat(grid.lng, grid.lat));
    saveSettings();
    hideDebugLayer();
    updateInfopanel();
});

map.on('idle', function () {
    // scope can be set if bindings.js is loaded (because of docReady) 
    scope.waterDepth = parseInt(grid.waterDepth) || 50;
    scope.gravityCenter = parseInt(grid.gravityCenter) || 0;
    scope.levelCorrection = parseInt(grid.levelCorrection) || 0;

    saveSettings();
});

geocoder.on('result', function (query) {
    grid.lng = query.result.center[0];
    grid.lat = query.result.center[1];

    setGrid(grid.lng, grid.lat, vmapSize);
    map.setZoom(10.2);

    saveSettings();
    hideDebugLayer();
    updateInfopanel();
});

function onMove(e) {
    grid.lng = e.lngLat.lng;
    grid.lat = e.lngLat.lat;
    setGrid(e.lngLat.lng, e.lngLat.lat, vmapSize);
}

function onUp(e) {
    grid.lng = e.lngLat.lng;
    grid.lat = e.lngLat.lat;
    setGrid(e.lngLat.lng, e.lngLat.lat, vmapSize);

    // Unbind mouse/touch events
    map.off('mousemove', onMove);
    map.off('touchmove', onMove);

    hideDebugLayer();
    updateInfopanel();
}

function addSource() {
    map.addSource('grid', {
        'type': 'geojson',
        'data': getGrid(grid.lng, grid.lat, vmapSize)
    });

    map.addSource('playable', {
        'type': 'geojson',
        'data': getGrid(grid.lng, grid.lat, vmapSize / 9 * 5)
    });

    map.addSource('start', {
        'type': 'geojson',
        'data': getGrid(grid.lng, grid.lat, vmapSize / 9)
    });

    map.addSource('mapbox-streets', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v12'
    });

    map.addSource('contours', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-terrain-v2'
    });
}

function addLayer() {
    map.addLayer({
        'id': 'gridlines',
        'type': 'fill',
        'source': 'grid',
        'paint': {
            'fill-color': 'gray',
            'fill-outline-color': 'gray',
            'fill-opacity': 0.25
        }
    });

    map.addLayer({
        'id': 'playablesquare',
        'type': 'fill',
        'source': 'playable',
        'paint': {
            'fill-color': 'green',
            'fill-outline-color': 'green',
            'fill-opacity': 0.3
        }
    });

    map.addLayer({
        'id': 'startsquare',
        'type': 'fill',
        'source': 'start',
        'paint': {
            'fill-color': 'blue',
            'fill-outline-color': 'blue',
            'fill-opacity': 0.1
        }
    });

    map.addLayer({
        'id': 'contours',
        'type': 'line',
        'source': 'contours',
        'source-layer': 'contour',
        'layout': {
            'visibility': 'visible',
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#877b59',
            'line-width': 0.25
        }
    });

    map.addLayer({
        'id': 'water-streets',
        'source': 'mapbox-streets',
        'source-layer': 'water',
        'type': 'fill',
        'paint': {
            'fill-color': 'rgba(66,100,225, 0.3)',
            'fill-outline-color': 'rgba(33,33,255, 1)'
        }
    });
}

function setDebug() {
    // debug: area that is downloaded
    if (debug) {
        map.addSource('debug', {
            'type': 'geojson',
            // 'data': turf.squareGrid([0, 0, 0, 0], tileSize, { units: 'kilometers' })
            'data': turf.bboxPolygon(turf.bbox(turf.lineString([0, 0], [0, 0])))
        });

        map.addLayer({
            'id': 'debugLayer',
            'type': 'line',
            'source': 'debug',
            'paint': {
                'line-color': 'orangered',
                'line-width': 1
            },
            'layout': {
                'visibility': 'none'
            },
        });

        document.getElementById('wMap-canvas').style.visibility = 'visible';
        document.getElementById('dcBox').style.display = 'block';
    }
}

function setMouse() {
    map.on('mouseenter', 'startsquare', function () {
        map.setPaintProperty('startsquare', 'fill-opacity', 0.3);
        map.setPaintProperty('startsquare', 'fill-color', 'blue');
        mapCanvas.style.cursor = 'move';
        hideDebugLayer()
    });

    map.on('mouseleave', 'startsquare', function () {
        map.setPaintProperty('startsquare', 'fill-color', 'blue');
        map.setPaintProperty('startsquare', 'fill-opacity', 0.1);
        mapCanvas.style.cursor = '';
        saveSettings();
    });

    map.on('mousedown', 'startsquare', function (e) {
        // Prevent the default map drag behavior.
        e.preventDefault();

        mapCanvas.style.cursor = 'grab';

        map.on('mousemove', onMove);
        map.once('mouseup', onUp);
    });

    map.on('touchstart', 'startsquare', function (e) {
        if (e.points.length !== 1) return;

        // Prevent the default map drag behavior.
        e.preventDefault();

        map.on('touchmove', onMove);
        map.once('touchend', onUp);
    });
}

function showHeightContours(el) {
    grid.heightContours = !grid.heightContours;
    if (grid.heightContours) {
        el.classList.add('active');
    } else {
        el.classList.remove('active');
    }
    showHeightLayer();
}

function showHeightLayer() {
    let el = document.getElementById('showHeightContours');
    if (grid.heightContours) {
        if (!el.classList.contains('active')) el.classList.add('active');
        map.setLayoutProperty('contours', 'visibility', 'visible');
    } else {
        if (el.classList.contains('active')) el.classList.remove('active');
        map.setLayoutProperty('contours', 'visibility', 'none');
    }
}

function showWaterContours(el) {
    grid.waterContours = !grid.waterContours;
    if (grid.waterContours) {
        el.classList.add('active');
    } else {
        el.classList.remove('active');
    }
    showWaterLayer();
}

function showWaterLayer() {
    let el = document.getElementById('showWaterContours');
    if (grid.waterContours) {
        if (!el.classList.contains('active')) el.classList.add('active');
        map.setLayoutProperty('water-streets', 'visibility', 'visible');
    } else {
        if (el.classList.contains('active')) el.classList.remove('active');
        map.setLayoutProperty('water-streets', 'visibility', 'none');
    }
}

function deleteCaches() {
    if (confirm('Delete the caches.\nIs that okay?')) {
        caches.delete('tiles').then(() => {
            caches.open('tiles').then((data) => cache = data);
        });
    }
}

function setMapStyle(el) {
    const layerId = el.id;
    let styleName = map.getStyle().metadata['mapbox:origin'];
    if (!(styleName)) {
        styleName = 'satellite-v9';
    }
    if (layerId != styleName) {
        map.setStyle('mapbox://styles/mapbox/' + layerId);
    }
}

function setLngLat(mode) {
    let lngInput = document.getElementById('lngInput');
    let latInput = document.getElementById('latInput');

    switch (mode) {
        case 0:
            lngInput.value = grid.lng;
            latInput.value = grid.lat;
            break;
        case 1:
            lngInput.value = '';
            latInput.value = '';
            break;
        case 2:
            if ((lngInput.value) && (latInput.value)) {
                grid.lng = parseFloat(lngInput.value);
                grid.lat = parseFloat(latInput.value);

                setGrid(grid.lng, grid.lat, vmapSize);
                map.panTo(new mapboxgl.LngLat(grid.lng, grid.lat));

                saveSettings();
                hideDebugLayer();
                updateInfopanel();
            }
            break;
    }
}

function hideDebugLayer() {
    if (debug) map.setLayoutProperty('debugLayer', 'visibility', 'none');
    grid.minHeight = null;
    grid.maxHeight = null;
}

function setGrid(lng, lat, size) {
    map.getSource('grid').setData(getGrid(lng, lat, size));
    map.getSource('start').setData(getGrid(lng, lat, size / 9));
    map.getSource('playable').setData(getGrid(lng, lat, size / 9 * 5));
    grid.zoom = map.getZoom();
}

function getExtent(lng, lat, size = vmapSize) {
    let dist = Math.sqrt(2 * Math.pow(size / 2, 2));
    let point = turf.point([lng, lat]);
    let topleft = turf.destination(point, dist, -45, { units: 'kilometers' }).geometry.coordinates;
    let bottomright = turf.destination(point, dist, 135, { units: 'kilometers' }).geometry.coordinates;
    return { 'topleft': topleft, 'bottomright': bottomright };
}

function getGrid(lng, lat, size) {
    let extent = getExtent(lng, lat, size);
    return turf.squareGrid([extent.topleft[0], extent.topleft[1], extent.bottomright[0], extent.bottomright[1]], tileSize, { units: 'kilometers' });
}

function loadSettings() {
    let stored = JSON.parse(localStorage.getItem('grid')) || {};
    
    // San Francisco
    stored.lng = parseFloat(stored.lng) || -122.43877;
    stored.lat = parseFloat(stored.lat) || 37.75152;
    
    stored.zoom = parseFloat(stored.zoom) || 11.0;
    
    stored.minHeight = parseFloat(stored.minHeight) || 0;
    stored.maxHeight = parseFloat(stored.maxHeight) || 0;
    
    stored.heightContours = stored.heightContours || false;
    stored.waterContours = stored.waterContours || false;

    // TODO: do not set global vars!
    document.getElementById('waterDepth').value = parseInt(stored.waterDepth) || defaultWaterdepth;
    document.getElementById('tiltHeight').value = parseInt(stored.tiltHeight) || parseInt(stored.waterDepth / 2);

    document.getElementById('drawGrid').checked = stored.drawGrid || false;
    document.getElementById('drawStrm').checked = stored.drawStreams || false;
    document.getElementById('drawMarker').checked = stored.drawMarker || false;

    document.getElementById('blurPasses').value = parseInt(stored.blurPasses) || 7;
    document.getElementById('blurPostPasses').value = parseInt(stored.blurPostPasses) || 3;
    document.getElementById('plainsHeight').value = parseInt(stored.plainsHeight) || 140;
    document.getElementById('streamDepth').value = parseInt(stored.streamDepth) || 140;

    return stored;
}

function saveSettings() {
    grid.zoom = map.getZoom();

    grid.drawGrid = document.getElementById('drawGrid').checked;
    grid.waterDepth = parseInt(document.getElementById('waterDepth').value);
    grid.drawStreams = document.getElementById('drawStrm').checked;
    grid.drawMarker = document.getElementById('drawMarker').checked;
    
    grid.plainsHeight = parseInt(document.getElementById('plainsHeight').value);
    grid.blurPasses = parseInt(document.getElementById('blurPasses').value);
    grid.blurPostPasses = parseInt(document.getElementById('blurPostPasses').value);
    grid.streamDepth = parseInt(document.getElementById('streamDepth').value);

    grid.gravityCenter = scope.gravityCenter;
    grid.tiltHeight = parseInt(document.getElementById('tiltHeight').value);

    grid.levelCorrection = scope.levelCorrection;

    localStorage.setItem('grid', JSON.stringify(grid));
}

function Create2DArray(rows, def = null) {
    let arr = new Array(rows);
    for (let i = 0; i < rows; i++) {
        arr[i] = new Array(rows).fill(def);
    }
    return arr;
}

// for debugging maps (2 dimensinal array), and 1 dimensional arrays
// use a format that is understood by excel (comma delimeted)
// and locale of the browser (and thus excel i presume)
function exportToCSV(mapData) {
    let csvRows = [];
    function isNumber(n) { return !isNaN(parseFloat(n)) && !isNaN(n - 0) }

    for(var i=0, l=mapData.length; i<l; ++i) {
        let val = mapData[i];
        // test for array dimension
        if(Array.isArray(val)) {
            if(isNumber(val[0])) {
                csvRows.push(val.map(x => x.toLocaleString(undefined)).join('\t')); 
            } else {
                csvRows.push(val.join('\t'));
            }
        } else { // 1 dimensional array
            if(isNumber(val)) {
                csvRows.push(val.toLocaleString(undefined));
            } else {
                csvRows.push(val);
            }           
        }
    }

    let csvString = csvRows.join('\r\n');
    let a = document.createElement('a');

    a.href        = 'data:attachment/csv,' +  encodeURIComponent(csvString);
    a.target      = '_blank';
    a.download    = 'myFile.csv';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function togglePanel(index) {
    let isOpens = [];
    for (let i = 0; i < panels.length; i++) {
        isOpens.push(panels[i].classList.contains('slide-in'));
    }
    for (let i = 0; i < panels.length; i++) {
        if (isOpens[i] && (i != index)) {
            panels[i].setAttribute('class', 'panel slide-out');
            icons[i].setAttribute('class', iconClass[i]);
        }
    }

    panels[index].setAttribute('class', isOpens[index] ? 'panel slide-out' : 'panel slide-in');
    icons[index].setAttribute('class', isOpens[index] ? iconClass[index] : 'icon fas fa-angle-left');

    // initial settings when each panel is opened
    switch (index) {
        case 0:
            if (!isOpens[0]) {
                getHeightmap(2);
            }
            break;
        case 1:
            if (!isOpens[1]) {
                let styleName = map.getStyle().metadata['mapbox:origin'];
                if (!(styleName)) {
                    styleName = 'satellite-v9';
                }
                document.getElementById(styleName).checked = true;
            }
            break;
        case 2:
            // none
            break;
    }
}

function sanatizeMap(map, xOffset, yOffset) {
    const citiesmapSize = 1081;
    let sanatizedMap = Create2DArray(citiesmapSize, 0);

    let lowestPositve = 100000;

    // pass 1: normalize the map, and determine the lowestPositve
    for (let y = yOffset; y < yOffset + citiesmapSize; y++) {
        for (let x = xOffset; x < xOffset + citiesmapSize; x++) {
            let h = map[y][x]; 
            if(h >= 0 && h < lowestPositve) {
                lowestPositve = h;
            }                  
            sanatizedMap[y - yOffset][x - xOffset] = h;
        }
    }

    // pass 2: fix negative heights artifact in mapbox maps
    for (let y = 0; y < citiesmapSize; y++) {
        for (let x = 0; x < citiesmapSize; x++) {
            let h = sanatizedMap[y][x];
            if(h < 0) {
                sanatizedMap[y][x] = lowestPositve;                
            }
        }
    }

    return sanatizedMap;
}

function sanatizeWatermap(map, xOffset, yOffset) {
    const citiesmapSize = 1081;
    let watermap = Create2DArray(citiesmapSize, 0);

    for (let y = yOffset; y < yOffset + citiesmapSize; y++) {
        for (let x = xOffset; x < yOffset + citiesmapSize; x++) {
            let h = map[y][x];
            watermap[y - yOffset][x - xOffset] = h;
        }
    }

    return watermap;
}

function calcMinMaxHeight(map) {
    const maxY = map.length; 
    const maxX = map[0].length;

    const heights = {min: 100000, max: -100000}

    for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {            
            let h = map[y][x];
            if (h > heights.max) heights.max = h;
            if (h < heights.min) heights.min = h;            
        }
    }

    heights.min = heights.min / 10;
    heights.max = heights.max / 10;
    
    return heights;
}

function updateInfopanel() {
    let rhs = 17.28 / mapSize * 100;
     
    document.getElementById('rHeightscale').innerHTML = rhs.toFixed(1);
    document.getElementById('lng').innerHTML = grid.lng.toFixed(5);
    document.getElementById('lat').innerHTML = grid.lat.toFixed(5);
    document.getElementById('minh').innerHTML = grid.minHeight;
    document.getElementById('maxh').innerHTML = grid.maxHeight;
}

function zoomIn() {
    map.zoomIn();
}

function zoomOut() {
    map.zoomOut();
}

function changeMapsize(el) {
    mapSize = el.value / 1;
    vmapSize = mapSize * 1.05;
    tileSize = mapSize / 9;
    setGrid(grid.lng, grid.lat, vmapSize);

    grid.minHeight = null;
    grid.maxHeight = null;
    updateInfopanel();
}

function setBaseLevel() {
    if(grid.minHeight === null) {
       new Promise((resolve) => {
            getHeightmap(2, resolve);
        }).then(() => {
            scope.baseLevel = grid.minHeight;            
        });
    }
    else {
        scope.baseLevel = grid.minHeight;
    }
    saveSettings();
}

function setHeightScale() {
    if(grid.maxHeight === null) {
        new Promise((resolve) => {
            getHeightmap(2, resolve);
        }).then(() => {
            scope.heightScale = Math.min(250, Math.floor((1024 - scope.waterDepth) / (grid.maxHeight - scope.baseLevel) * 100));
        });
    } else {
        scope.heightScale = Math.min(250, Math.floor((1024 - scope.waterDepth) / (grid.maxHeight - scope.baseLevel) * 100));
    }
    saveSettings();
}

function incPb(el, value = 1) {
    let v = el.value + value;
    el.value = v;
}

function getHeightmap(mode = 0, callback) {
    pbElement.value = 0;
    pbElement.style.visibility = 'visible';

    saveSettings(false);

    // get the extent of the current map
    // in heightmap, each pixel is treated as vertex data, and 1081px represents 1080 faces
    // therefore, "1px = 16m" when the map size is 17.28km
    let extent = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);

    // zoom is 13 in principle
    let zoom = 13;

    incPb(pbElement);
    // get a tile that covers the top left and bottom right (for the tile count calculation)
    let x = long2tile(extent.topleft[0], zoom);
    let y = lat2tile(extent.topleft[1], zoom);
    let x2 = long2tile(extent.bottomright[0], zoom);
    let y2 = lat2tile(extent.bottomright[1], zoom);

    // get the required tile count in Zoom 13
    let tileCnt = Math.max(x2 - x + 1, y2 - y + 1);

    // fixed in high latitudes: adjusted the tile count to 6 or less
    // because Terrain RGB tile distance depends on latitude
    // don't need too many tiles
    incPb(pbElement);
    if (tileCnt > 6) {
        let z = zoom;
        let tx, ty, tx2, ty2, tc;
        do {
            z--;
            tx = long2tile(extent.topleft[0], z);
            ty = lat2tile(extent.topleft[1], z);
            tx2 = long2tile(extent.bottomright[0], z);
            ty2 = lat2tile(extent.bottomright[1], z);
            tc = Math.max(tx2 - tx + 1, ty2 - ty + 1);
            incPb(pbElement);
        } while (tc > 6);
        // reflect the fixed result
        x = tx;
        y = ty;
        zoom = z;
        tileCnt = tc;
    }

    let tileLng = tile2long(x, zoom);
    let tileLat = tile2lat(y, zoom);

    let tileLng2 = tile2long(x + tileCnt, zoom);
    let tileLat2 = tile2lat(y + tileCnt, zoom);

    // get the length of one side of the tiles extent
    let distance = turf.distance(turf.point([tileLng, tileLat]), turf.point([tileLng2, tileLat2]), { units: 'kilometers' }) / Math.SQRT2;

    // find out the center position of the area we want inside the tiles
    let topDistance = turf.distance(turf.point([tileLng, tileLat]), turf.point([tileLng, extent.topleft[1]]), { units: 'kilometers' });
    let leftDistance = turf.distance(turf.point([tileLng, tileLat]), turf.point([extent.topleft[0], tileLat]), { units: 'kilometers' });

    // create the tiles empty array
    let tiles = Create2DArray(tileCnt);

    if (debug) {
        map.setLayoutProperty('debugLayer', 'visibility', 'visible');
        let line = turf.lineString([[tileLng, tileLat], [tileLng2, tileLat2]]);
        map.getSource('debug').setData(turf.bboxPolygon(turf.bbox(line)));
    }

    // download the tiles
    for (let i = 0; i < tileCnt; i++) {
        for (let j = 0; j < tileCnt; j++) {
            incPb(pbElement);
            let url = 'https://api.mapbox.com/v4/mapbox.terrain-rgb/' + zoom + '/' + (x + j) + '/' + (y + i) + '@2x.pngraw?access_token=' + mapboxgl.accessToken;
            let woQUrl = 'https://api.mapbox.com/v4/mapbox.terrain-rgb/' + zoom + '/' + (x + j) + '/' + (y + i) + '@2x.pngraw';

            downloadPngToTile(url, woQUrl).then((png) => tiles[i][j] = png);

        }
    }

    // download pbf to vTiles
    var vTiles = Create2DArray(tileCnt);

    for (let i = 0; i < tileCnt; i++) {
        for (let j = 0; j < tileCnt; j++) {
            incPb(pbElement);
            let url = 'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/' + zoom + '/' + (x + j) + '/' + (y + i) + '.vector.pbf?access_token=' + mapboxgl.accessToken;
            let woQUrl = 'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/' + zoom + '/' + (x + j) + '/' + (y + i) + '.vector.pbf';

            downloadPbfToTile(url, woQUrl).then((data) => vTiles[i][j] = data);
        }
    }

    // wait for the download to complete
    let ticks = 0;
    let timer = window.setInterval(function () {
        ticks++;
        incPb(pbElement);

        if (isDownloadComplete(tiles, vTiles)) {
            console.log('download ok');
            clearInterval(timer);
            let citiesmap, png, canvas, url;

            // heightmap size corresponds to 1081px map size
            let heightmap = toHeightmap(tiles, distance);

            // heightmap edge to map edge distance
            let xOffset = Math.round(leftDistance / distance * heightmap.length);
            let yOffset = Math.round(topDistance / distance * heightmap.length);

            let sanatizedMap = sanatizeMap(heightmap, xOffset, yOffset);

            let heights = calcMinMaxHeight(sanatizedMap); 
            grid.minHeight = heights.min;
            grid.maxHeight = heights.max;

            pbElement.value = 500;
            // callback after height calculation is completed
            if (typeof callback === 'function') callback();

            let watermap = sanatizeWatermap(toWatermap(vTiles, heightmap.length), xOffset, yOffset);

            switch (mode) {
                case 0:
                    // never draw a grid on a raw heightmap
                    let savedDrawGrid = document.getElementById('drawGrid').checked;
                    document.getElementById('drawGrid').checked = false;
                    citiesmap = toCitiesmap(sanatizedMap, watermap);
                    download('heightmap.raw', citiesmap);
                    document.getElementById('drawGrid').checked = savedDrawGrid;
                    break;
                case 1:
                    citiesmap = toCitiesmap(sanatizedMap, watermap);
                    png = UPNG.encodeLL([citiesmap], 1081, 1081, 1, 0, 16);
                    download('heightmap.png', png);
                    break;
                case 2:
                    updateInfopanel();
                    break;
                case 3:
                    citiesmap = toCitiesmap(sanatizedMap, watermap);
                    png = UPNG.encodeLL([citiesmap], 1081, 1081, 1, 0, 16);
                    downloadAsZip(png, 1);
                    break;
                case 255:
                    canvas = toTerrainRGB(heightmap);
                    url = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
                    download('tiles.png', null, url);
                    break;
            }
            console.log('complete in ', ticks * 10, ' ms');
            pbElement.style.visibility = 'hidden';
            pbElement.value = 0;
        }

        // timeout!
        if (ticks >= 4096) {
            clearInterval(timer);
            console.error('timeout!');
            pbElement.value = 0;
        }
    }, 10);
}


async function getOSMData() {
    let bounds = getExtent(grid.lng, grid.lat, mapSize);
    let minLng = Math.min(bounds.topleft[0], bounds.bottomright[0]);
    let minLat = Math.min(bounds.topleft[1], bounds.bottomright[1]);
    let maxLng = Math.max(bounds.topleft[0], bounds.bottomright[0]);
    let maxLat = Math.max(bounds.topleft[1], bounds.bottomright[1]);

    let url = 'https://overpass-api.de/api/map?bbox='
        + minLng + ','
        + minLat + ','
        + maxLng + ','
        + maxLat;

    try {
        const response = await fetch(url);
        if (response.ok) {
            let osm= await response.blob();
            download('map.osm', osm);
            console.log(bounds.topleft[0], bounds.topleft[1], bounds.bottomright[0], bounds.bottomright[1]);
        } else {
            throw new Error('download map error:', response.status);
        }
    } catch (e) {
        console.log(e.message);
    }
}


async function getMapImage() {
    let bounds = getExtent(grid.lng, grid.lat, mapSize);
    let minLng = Math.min(bounds.topleft[0], bounds.bottomright[0]);
    let minLat = Math.min(bounds.topleft[1], bounds.bottomright[1]);
    let maxLng = Math.max(bounds.topleft[0], bounds.bottomright[0]);
    let maxLat = Math.max(bounds.topleft[1], bounds.bottomright[1]);

    let styleName = map.getStyle().metadata['mapbox:origin'];
    if (!(styleName)) {
        styleName = 'satellite-v9';
    }

    let url = 'https://api.mapbox.com/styles/v1/mapbox/'
        + styleName + '/static/['
        + minLng + ','
        + minLat + ','
        + maxLng + ','
        + maxLat + ']/1280x1280@2x?access_token='
        + mapboxgl.accessToken;

    try {
        const response = await fetch(url);
        if (response.ok) {
            let png = await response.blob();
            download('map.png', png);
            console.log(bounds.topleft[0], bounds.topleft[1], bounds.bottomright[0], bounds.bottomright[1]);
        } else {
            throw new Error('download map error:', response.status);
        }
    } catch (e) {
        console.log(e.message);
    }
}

function autoSettings(withMap = true) {
    scope.mapSize = 17.28;
    scope.waterDepth = defaultWaterdepth;

    mapSize = scope.mapSize / 1;
    vmapSize = mapSize * 1.05;
    tileSize = mapSize / 9;

    if (withMap) {
        new Promise((resolve) => {
            getHeightmap(2, resolve);
        }).then(() => {
            scope.baseLevel = grid.minHeight;
            scope.heightScale = Math.min(250, Math.floor((1024 - scope.waterDepth) / (grid.maxHeight - scope.baseLevel) * 100));            
        });
    }

    setGrid(grid.lng, grid.lat, vmapSize);

    document.getElementById('drawStrm').checked = true;

    document.getElementById('drawMarker').checked = true;
    document.getElementById('drawGrid').checked = true;

    document.getElementById('plainsHeight').value = 140;
    document.getElementById('blurPasses').value = 10;
    document.getElementById('blurPostPasses').value = 2;
    document.getElementById('streamDepth').value = 7;
}

function isDownloadComplete(tiles, vTiles) {
    let tileNum = tiles.length;
    for (let i = 0; i < tileNum; i++) {
        for (let j = 0; j < tileNum; j++) {
            if (!(tiles[i][j]) || !(vTiles[i][j])) return false;
        }
    }
    return true;
}

function toWatermap(vTiles, length) {
    // extract feature geometry from VectorTileFeature in VectorTile.
    // draw the polygons of the water area from the feature geometries and return as a water area map.

    let tileCnt = vTiles.length;
    let canvas = document.getElementById('wMap-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = length;
    canvas.height = length;

    let coef = length / (tileCnt * 4096);     // vTiles[][].layers.water.feature(0).extent = 4096 (default)

    // water
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, length, length);
    ctx.fillStyle = '#000000';
    ctx.beginPath();

    for (let ty = 0; ty < tileCnt; ty++) {
        for (let tx = 0; tx < tileCnt; tx++) {
            if (typeof vTiles[ty][tx] !== "boolean") {
                if (vTiles[ty][tx].layers.water) {
                    let geo = vTiles[ty][tx].layers.water.feature(0).loadGeometry();

                    for (let i = 0; i < geo.length; i++) {
                        ctx.moveTo(Math.round(geo[i][0].x * coef + (tx * length / tileCnt)), Math.round(geo[i][0].y * coef + (ty * length / tileCnt)));
                        for (let j = 1; j < geo[i].length; j++) {
                            ctx.lineTo(Math.round(geo[i][j].x * coef + (tx * length / tileCnt)), Math.round(geo[i][j].y * coef + (ty * length / tileCnt)));
                        }
                    }
                }
            }
        }
    }
    ctx.closePath();
    ctx.fill();

    if (document.getElementById('drawStrm').checked) {
        // waterway
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let ty = 0; ty < tileCnt; ty++) {
            for (let tx = 0; tx < tileCnt; tx++) {
                if (typeof vTiles[ty][tx] !== "boolean") {
                    if (vTiles[ty][tx].layers.waterway) {
                        let geo = vTiles[ty][tx].layers.waterway.feature(0).loadGeometry();

                        for (let i = 0; i < geo.length; i++) {
                            ctx.moveTo(Math.round(geo[i][0].x * coef + (tx * length / tileCnt)), Math.round(geo[i][0].y * coef + (ty * length / tileCnt)));
                            for (let j = 1; j < geo[i].length; j++) {
                                ctx.lineTo(Math.round(geo[i][j].x * coef + (tx * length / tileCnt)), Math.round(geo[i][j].y * coef + (ty * length / tileCnt)));
                            }
                        }
                    }
                }
            }
        }
        ctx.stroke();
    }

    let watermap = Create2DArray(length, 1);
    let img = ctx.getImageData(0, 0, length, length);

    for (let i = 0; i < length; i++) {
        for (let j = 0; j < length; j++) {
            let index = i * length * 4 + j * 4;
            watermap[i][j] = img.data[index] / 255;     // 0 => 255 : 0 => 1    0 = water, 1 = land
        }
    }

    return watermap;
}

// map filtering, for example smoothing the pixels in the plains, but leaving mountains and sea untouched
// or enhance mountain edges
// pas a kernel for filtering
// see: https://en.wikipedia.org/wiki/Kernel_(image_processing) 

function filterMap(map, fromLevel, toLevel, kernel) {
    const maxY = map.length;
    const maxX = map[0].length;

    // kernel size must be uneven!
    const kernelDist = parseInt((kernel.length - 1) / 2);
    
    const filteredMap = Create2DArray(maxY, 0);

    for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {
            let h = map[y][x];
            if (h >= fromLevel && h < fromLevel + toLevel) {
                let sum = 0;
                let cnt = 0;
                for(let i = -kernelDist; i <= kernelDist; i++) {
                    for(let j = -kernelDist; j <= kernelDist; j++) {
                        if (y+i >=0 && y+i < maxY && x+j >= 0 && x+j < maxX) {
                            cnt += kernel[i+kernelDist][j+kernelDist];
                            sum += map[y+i][x+j] * kernel[i+kernelDist][j+kernelDist];                            
                        }
                    }
                }
                if(cnt) h = sum / cnt;
            }
            filteredMap[y][x] = h; 
        }
    }
    
    return filteredMap;
}

function tiltMap(map, gravityCenter, waterDepth) {
    const maxY = map.length;
    const maxX = map[0].length;
    
    const tiltedMap = Create2DArray(maxY, 0);
    let gravityPoint = {};

    switch(gravityCenter) {
        case 1: // center
            gravityPoint.x = parseInt(maxX / 2);
            gravityPoint.y = parseInt(maxY / 2);
            break;
        case 2: // North center
            gravityPoint.x = parseInt(maxX / 2);
            gravityPoint.y = 0;
            break;
        case 3: // North - East
            gravityPoint.x = maxX;
            gravityPoint.y = 0;
            break;
        case 4: // East center
            gravityPoint.x = maxX;
            gravityPoint.y = parseInt(maxY  / 2);
            break;
        case 5: // South - East
            gravityPoint.x = maxX;
            gravityPoint.y = maxY;
            break;
        case 6: // South center
            gravityPoint.x = parseInt(maxX / 2);
            gravityPoint.y = maxY;
            break;
        case 7: // South - West
            gravityPoint.x = 0;
            gravityPoint.y = maxY;
            break;
        case 8: // West center
            gravityPoint.x = 0;
            gravityPoint.y = parseInt(maxY / 2);
            break;
        case 9: // North - West
            gravityPoint.x = 0;
            gravityPoint.y = 0;
            break;
        case 10: // North side
            gravityPoint.y = 0;
            break;
        case 11: // East side
            gravityPoint.x = maxX;
            break;
        case 12: // South side
            gravityPoint.y = maxY;
            break;
        case 13: // West side
            gravityPoint.x = 0;
            break;
        default:
            // do nothing
    }

    for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {
            let h = map[y][x];
            let correction = 0; 
            
            //calculate the relative distance to the gravity center or side
            let relDistance = 0;
            switch(gravityCenter) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                    //pythagoras for distance
                    relDistance = Math.sqrt(Math.pow(gravityPoint.x - x, 2) + Math.pow(gravityPoint.y - y, 2)) / maxY;
                    break;
                case 10:
                case 12:
                    // north and south side, only take y distance into account
                    relDistance = Math.abs(gravityPoint.y - y) / maxY;
                    break;
                case 11:
                case 13:
                    // east and west side, only take x distance into account
                    relDistance = Math.abs(gravityPoint.x - x) / maxX;
                    break;
                default:
                    // do nothing
            }

            tiltedMap[y][x] = h +  Math.round(waterDepth * relDistance * 100) / 100;;
        }
    }

    if(gravityCenter == 0) {
        console.log('no map tilting');
    } else{
        console.log(`tilted map in direction ${gravityCenter} with ${waterDepth} m`);
    }
    return tiltedMap;
}

function interpolateArray(data, fitCount) {

    var linearInterpolate = function (before, after, atPoint) {
        return before + (after - before) * atPoint;
    };

    var newData = new Array();
    var springFactor = new Number((data.length - 1) / (fitCount - 1));
    newData[0] = data[0]; // for new allocation
    for ( var i = 1; i < fitCount - 1; i++) {
        var tmp = i * springFactor;
        var before = new Number(Math.floor(tmp)).toFixed();
        var after = new Number(Math.ceil(tmp)).toFixed();
        var atPoint = tmp - before;
        newData[i] = linearInterpolate(data[before], data[after], atPoint);
    }
    newData[fitCount - 1] = data[data.length - 1]; // for new allocation
    return newData;
}

function levelMap(map, min, max, style) {
    let curve;


    switch(style) {
        case 1: // reserved for testing
            curve = [0.1, 1, 1.9];            
            break;
        case 2: // coastline and plains
            curve = [0.15, 0.45, 0.75, 1.1, 1.4, 1.7, 1.9, 1.9];
            break;
        case 3: // agressive coastline and plains
            curve = [0.1, 0.2, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
            break;
        case 9:
            curve = [0.1, 0.2, 0.5, 1, 1.3, 1.7, 2.5];
            break;
        default:
            console.log('no map leveling');
            return map;
    }

    const interpolatedCurve = interpolateArray(curve, 256);

    const maxY = map.length;
    const maxX = map[0].length;
    const elevationStep = Math.round((max - min) / interpolatedCurve.length);

    // calculate the minimum level for each index in the curve
    let levels = [min]; // size of the levels array will be 1 larger then the curve
    let lastLevel = min;
    for(let i = 0; i < interpolatedCurve.length; i++) {
        levels.push(Math.round((lastLevel + elevationStep * interpolatedCurve[i]) * 10) / 10);
        lastLevel = levels[i + 1];
    }

    // debugging
    //let debug = [];
    //for(let i = 0; i < interpolatedCurve.length; i++) {
    //    debug.push([i, interpolatedCurve[i], levels[i]]);
    //}
    //exportToCSV(debug);

    const leveledMap = Create2DArray(maxY, 0);

    let highestHight = 0;

    for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {
            let h = map[y][x];

            if(h - min > 0) {
                // calcualte the index based on the position in the heights array
                let idx = Math.min(interpolatedCurve.length - 1, Math.floor((h - min) / elevationStep));
                h = levels[idx] + ((h - levels[idx]) * interpolatedCurve[idx]);
                h = Math.round(h * 10) / 10;
            }
           leveledMap[y][x] = h;

           if(h > highestHight) highestHight = h;
        }
    }

    console.log(`min ${min} max ${max} highest high ${highestHight}`);
    // after releveling the map, it is possible that the highest point has become higher
    // rescale back to original min max
    let rescale = 10;
    if (highestHight > max) {
        rescale = Math.floor((max - min) / highestHight * 100) / 10; // little speed gain, by taking calc out the loop
        for (let y = 0; y < maxY; y++) {
            for (let x = 0; x < maxX; x++) {
                let h = leveledMap[y][x];
                if(h - min > 0) {
                    leveledMap[y][x] = Math.round(h * rescale) / 10;
                }
            }
        }
    }

    console.log(`leveled map with style ${style}, rescale ${rescale/10}`);
    return leveledMap;
}

function toHeightmap(tiles, distance) {
    let tileNum = tiles.length;
    let srcMap = Create2DArray(tileNum * 512, 0);

    // in heightmap, each pixel is treated as vertex data, and 1081px represents 1080 faces
    // therefore, "1px = 16m" when the map size is 17.28km
    let heightmap = Create2DArray(Math.ceil(1080 * (distance / mapSize)), 0);
    let smSize = srcMap.length;
    let hmSize = heightmap.length;
    let r = (hmSize - 1) / (smSize - 1);

    for (let i = 0; i < tileNum; i++) {
        for (let j = 0; j < tileNum; j++) {
            let tile = new Uint8Array(UPNG.toRGBA8(tiles[i][j])[0]);
            for (let y = 0; y < 512; y++) {
                for (let x = 0; x < 512; x++) {
                    let tileIndex = y * 512 * 4 + x * 4;
                    // resolution 0.1 meters
                    srcMap[i * 512 + y][j * 512 + x] = -100000 + ((tile[tileIndex] * 256 * 256 + tile[tileIndex + 1] * 256 + tile[tileIndex + 2]));
                }
            }
        }
    }

    // bilinear interpolation
    let hmIndex = Array(hmSize);

    for (let i = 0; i < hmSize; i++) { hmIndex[i] = i / r }
    for (let i = 0; i < (hmSize - 1); i++) {
        for (let j = 0; j < (hmSize - 1); j++) {
            let y0 = Math.floor(hmIndex[i]);
            let x0 = Math.floor(hmIndex[j]);
            let y1 = y0 + 1;
            let x1 = x0 + 1;
            let dy = hmIndex[i] - y0;
            let dx = hmIndex[j] - x0;
            heightmap[i][j] = Math.round((1 - dx) * (1 - dy) * srcMap[y0][x0] + dx * (1 - dy) * srcMap[y0][x1] + (1 - dx) * dy * srcMap[y1][x0] + dx * dy * srcMap[y1][x1]);
        }
    }
    for (let i = 0; i < hmSize; i++) { heightmap[i][hmSize - 1] = srcMap[i][hmSize - 1] }
    for (let j = 0; j < hmSize; j++) { heightmap[hmSize - 1][j] = srcMap[hmSize - 1][j] }

    return heightmap;
}

function toTerrainRGB(heightmap) {
    let canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = heightmap.length;
    canvas.height = heightmap.length;

    let img = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let r = Math.floor((Math.floor((heightmap[y][x] + 100000) / 256)) / 256);
            let g = (Math.floor((heightmap[y][x] + 100000) / 256)) % 256;
            let b = (heightmap[y][x] + 100000) % 256;

            let index = y * canvas.width * 4 + x * 4;

            // create pixel
            img.data[index + 0] = r;
            img.data[index + 1] = g;
            img.data[index + 2] = b;
            img.data[index + 3] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);

    return canvas;
}

function toCitiesmap(heightmap, watermap) {
    const citiesmapSize = 1081;

    // cities has L/H byte order
    let citiesmap = new Uint8ClampedArray(2 * citiesmapSize * citiesmapSize);
    let workingmap = Create2DArray(citiesmapSize, 0); 

    // correct the waterDepth for the scaling. 
    // in the final pass, it will be scaled back. Round to 1 decimal
    let waterDepth = Math.round(scope.waterDepth /  parseFloat(scope.heightScale) * 100 * 10) / 10;
    
    // watermap: => normalized depth between 0 => deepest water, 1 => land
    
    for (let y = 0; y < citiesmapSize; y++) {
        for (let x = 0; x < citiesmapSize; x++) {
            // stay with ints as long as possible
            let height = (heightmap[y][x] - scope.baseLevel * 10);
            
            // raise the land by the amount of water depth
            // a height lower than baselevel is considered to be the below sea level and the height is set to 0
            // water depth is unaffected by height scale
            // the map is unscaled at this point, so high mountains above 1024 meter can be present
            let calcHeight = (height + Math.round(waterDepth * 10 * watermap[y][x])) / 10;
            workingmap[y][x] = Math.max(0, calcHeight);                       
        }
    }

    // level correction, for specific needs
    // to smooth plains and dramatize mountains or level a mountanus coastline
    workingmap = levelMap(workingmap, grid.minHeight + waterDepth, grid.maxHeight, scope.levelCorrection);

    // smooth the plains and wateredges in a number of passes
    let passes = parseInt(document.getElementById('blurPasses').value);
    let postPasses = parseInt(document.getElementById('blurPostPasses').value);
    let plainsHeight = parseInt(document.getElementById('plainsHeight').value);
    for(let l=0; l<passes; l++) {
        workingmap = filterMap(workingmap, 0, plainsHeight + waterDepth, meanKernel);
    }

    // sharpen the mountains, for more dramatic effect
    for(let l=0; l<postPasses; l++) {
        workingmap = filterMap(workingmap, plainsHeight + waterDepth, grid.maxHeight, sharpenKernel);
    } 

    // if there where enough passes, all the small streams on the plains are faded.
    // so redraw them, with little extra depth
    let streamDepth = parseInt(document.getElementById('streamDepth').value);
    let highestWaterHeight = 0;
    if(document.getElementById('drawStrm').checked) {
            for (let y = 0; y < citiesmapSize; y++) {
            for (let x = 0; x < citiesmapSize; x++) {
                let height = workingmap[y][x];
                if(height > highestWaterHeight) {
                        highestWaterHeight = height;
                } 
                // prevent drawing below the seabed
                if (height > streamDepth) {
                    workingmap[y][x] = height - (1 - watermap[y][x]) * streamDepth;                
                }
            }
        }
    }

    // tilt the map in the direction of gravity, so water always flows to the lowest point
    let tiltHeight = parseInt(document.getElementById('tiltHeight').value);
    // correct the tiltHeight for the scale. In the final pass, it will be corrected back
    tiltHeight = Math.round(tiltHeight /  parseFloat(scope.heightScale) * 100 * 10) / 10;
    workingmap = tiltMap(workingmap, scope.gravityCenter, tiltHeight);

    // finally, finish the drawn streams with a light smoothing
    // the streams are drawn over the entire map, so post process the entire map
    for(let l=0; l<postPasses; l++) {
        workingmap = filterMap(workingmap, 0, highestWaterHeight, meanKernel);
    }     

    // debug
    //exportToCSV(workingmap);

    // convert the normalized and smoothed map to a cities skylines map/
    // As this is the final step, take scale into account
    for (let y = 0; y < citiesmapSize; y++) {
        for (let x = 0; x < citiesmapSize; x++) {
            // get the value in 1/10meyers and scale and convert to cities skylines 16 bit int
            let h = Math.round(workingmap[y][x] / 100 * parseFloat(scope.heightScale) / 0.015625);

            if (h > 65535) h = 65535;

            // calculate index in image
            let index = y * citiesmapSize * 2 + x * 2;

            // cities used hi/low 16 bit
            citiesmap[index + 0] = h >> 8;
            citiesmap[index + 1] = h & 255;
        }
    }

    //exportToCSV(citiesmap);

    // draw a grid on the image
    if (document.getElementById('drawGrid').checked) {
        for (let y = 0; y < citiesmapSize; y++) {
            for (let x = 0; x < citiesmapSize; x++) {

                if (y % 120 == 0 || x % 120 == 0) {
                    // calculate index in image
                    let index = y * citiesmapSize * 2 + x * 2;

                    // create pixel
                    citiesmap[index + 0] = 127;
                    citiesmap[index + 1] = 255;
                }
            }
        }
    }

    // marker, upper left corner
    if (document.getElementById('drawMarker').checked) {
        citiesmap[0] = 255;
        citiesmap[1] = 255;
        citiesmap[2] = 0;
        citiesmap[3] = 0;
    }

    // log the correct bounding rect to the console
    let bounds = getExtent(grid.lng, grid.lat, mapSize);
    console.log(bounds.topleft[0], bounds.topleft[1], bounds.bottomright[0], bounds.bottomright[1]);

    return citiesmap;
}

function download(filename, data, url = false) {
    var a = window.document.createElement('a');

    if (url) {
        a.href = url;
    } else {
        a.href = window.URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
    }
    a.download = filename;

    // Append anchor to body.
    document.body.appendChild(a)
    a.click();

    // Remove anchor from body
    document.body.removeChild(a)
}

async function downloadPngToTile(url, withoutQueryUrl = url) {
    const cachedRes = await caches.match(url, { ignoreSearch: true });
    if (cachedRes && cachedRes.ok) {
        console.log('terrain-rgb: load from cache');
        let pngData = await cachedRes.arrayBuffer();
        let png = UPNG.decode(pngData);
        return png;
    } else {
        console.log('terrain-rgb: load by fetch, cache downloaded file');
        try {
            const response = await fetch(url);
            if (response.ok) {
                let res = response.clone();
                let pngData = await response.arrayBuffer();
                let png = UPNG.decode(pngData);
                cache.put(withoutQueryUrl, res);
                return png;
            } else {
                throw new Error('download terrain-rgb error:', response.status);
            }
        } catch (e) {
            console.log(e.message);
        }
    }
}

async function downloadPbfToTile(url, withoutQueryUrl = url) {
    const cachedRes = await caches.match(url, { ignoreSearch: true });
    if (cachedRes && cachedRes.ok) {
        console.log('pbf: load from cache');
        let data = await cachedRes.arrayBuffer();
        let tile = new VectorTile(new Protobuf(new Uint8Array(data)));
        return tile;
    } else {
        console.log('pbf: load by fetch, cache downloaded file');
        try {
            const response = await fetch(url);
            if (response.ok) {
                let res = response.clone();
                let data = await response.arrayBuffer();
                let tile = new VectorTile(new Protobuf(new Uint8Array(data)));
                cache.put(withoutQueryUrl, res);
                return tile;
            } else {
                throw new Error('download Pbf error:', response.status);
            }
        } catch (e) {
            console.log(e.message);
            return true;
        }
    }
}

//Original by @Niharkanta1
function downloadAsZip(data, mode) {
    var filename = prompt("Please enter your map name", "HeightMap");
    if (filename == null) { return; }
    var zip = new JSZip();
    var info = getInfo(filename);
    zip.file("info.txt", info);
    let imageName = mode == 0 ? filename + ".raw" : (mode == 1 ? filename + ".png" : filename + "-tiles.png");
    zip.file(imageName, data, { binary: true });
    zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 1 } })
        .then(function (content) {
            download(filename + ".zip", content);
        });
}

function getInfo(fileName) {
    return 'Heightmap name: ' + fileName + '\n' +
        '\n' +
        '/* Generated by Cities: Skylines online heightmap generator (https://cs.heightmap.skydark.pl) (https://github.com/sysoppl/Cities-Skylines-heightmap-generator) */\n' +
        '\n' +
        'Longitude: ' + grid.lng.toFixed(5) + '\n' +
        'Latitude: ' + grid.lat.toFixed(5) + '\n' +
        'Min Height: ' + grid.minHeight + '\n' +
        'Max Height: ' + grid.maxHeight + '\n' +
        'Water contours: ' + grid.waterContours + '\n' +
        'Height contours: ' + grid.heightContours + '\n' +
        'Zoom: ' + grid.zoom + '\n';
}
