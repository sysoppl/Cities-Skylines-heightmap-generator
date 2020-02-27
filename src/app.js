'use strict'

var grid = loadSettings();

mapboxgl.accessToken = 'pk.eyJ1Ijoiam9obmJlcmciLCJhIjoiY2s2d3FwdTJpMDJnejNtbzBtb2ljbXZiYyJ9.yRKViKWpsMTtE-NPesWZvA';

var map = new mapboxgl.Map({
    container: 'map', // Specify the container ID
    style: 'mapbox://styles/mapbox/outdoors-v11', // Specify which map style to use
    center: [grid.lng, grid.lat], // Specify the starting position [lng, lat]
    zoom: grid.zoom // Specify the starting zoom
});

var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false
});

document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

map.on('load', function () {
    var canvas = map.getCanvasContainer();

    map.addSource('grid', {
        'type': 'geojson',
        'data': getGrid(grid.lng, grid.lat, 18)
    });

    map.addLayer({
        'id': 'gridlines',
        'type': 'line',
        'source': 'grid',
        'paint': {
            'line-color': 'gray',
            'line-width': 0.35
        }
    });

    map.addSource('start', {
        'type': 'geojson',
        'data': getGrid(grid.lng, grid.lat, 2)
    });

    map.addLayer({
        'id': 'startsquare',
        'type': 'fill',
        'source': 'start',
        'paint': {
            'fill-color': 'transparent',
            'fill-outline-color': 'blue',
            'fill-opacity': 1
        }
    });

    // debug: area that is downloaded
    map.addSource('debug', {
        'type': 'geojson',
        'data': turf.squareGrid([0, 0, 0, 0], 2, { units: 'kilometers' })
    });

    map.addLayer({
        'id': 'debugLayer',
        'type': 'line',
        'source': 'debug',
        'paint': {
            'line-color': '#bdb76b',
            'line-width': 0.5
        },
        'layout': {
            'visibility': 'none'
        },
    });


    map.on('mouseenter', 'startsquare', function () {
        map.setPaintProperty('startsquare', 'fill-opacity', 0.15);
        map.setPaintProperty('startsquare', 'fill-color', 'gray');
        canvas.style.cursor = 'move';
        hideDebugLayer()
    });

    map.on('mouseleave', 'startsquare', function () {
        map.setPaintProperty('startsquare', 'fill-color', 'transparent');
        map.setPaintProperty('startsquare', 'fill-opacity', 1);
        canvas.style.cursor = '';
        saveSettings();
    });

    map.on('mousedown', 'startsquare', function (e) {
        // Prevent the default map drag behavior.
        e.preventDefault();

        canvas.style.cursor = 'grab';

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

});

map.on('click', function (e) {
    grid.lng = e.lngLat.lng;
    grid.lat = e.lngLat.lat;

    setGrid(grid.lng, grid.lat, 18);
    map.panTo(new mapboxgl.LngLat(grid.lng, grid.lat));
    saveSettings();
    hideDebugLayer();
    updateInfopanel();
});

map.on('idle', function () {
    saveSettings();
});

geocoder.on('result', function (query) {
    grid.lng = query.result.center[0];
    grid.lat = query.result.center[1];

    setGrid(grid.lng, grid.lat, 18);
    map.setZoom(10.2);

    saveSettings();
    hideDebugLayer();
    updateInfopanel();
});

function onMove(e) {
    grid.lng = e.lngLat.lng;
    grid.lat = e.lngLat.lat;
    setGrid(e.lngLat.lng, e.lngLat.lat, 18);
}

function onUp(e) {
    grid.lng = e.lngLat.lng;
    grid.lat = e.lngLat.lat;
    setGrid(e.lngLat.lng, e.lngLat.lat, 18);

    // Unbind mouse/touch events
    map.off('mousemove', onMove);
    map.off('touchmove', onMove);

    hideDebugLayer();
    updateInfopanel();
}

function hideDebugLayer() {
    map.setLayoutProperty('debugLayer', 'visibility', 'none');
    grid.minHeight = null;
    grid.maxHeight = null;
}

function setGrid(lng, lat, size) {
    map.getSource('grid').setData(getGrid(lng, lat, size));
    map.getSource('start').setData(getGrid(lng, lat, size / 9));
    grid.zoom = map.getZoom();
}

function getExtent(lng, lat, size = 18) {
    let dist = Math.sqrt(2 * Math.pow(size / 2, 2)) + 0.1;
    let point = turf.point([lng, lat]);
    let topleft = turf.destination(point, dist, -45, { units: 'kilometers' }).geometry.coordinates;
    let bottomright = turf.destination(point, dist, 135, { units: 'kilometers' }).geometry.coordinates;
    return { 'topleft': topleft, 'bottomright': bottomright };
}

function getGrid(lng, lat, size) {
    let extent = getExtent(lng, lat, size);
    return turf.squareGrid([extent.topleft[0], extent.topleft[1], extent.bottomright[0], extent.bottomright[1]], 2, { units: 'kilometers' });
}

function loadSettings() {
    let grid = JSON.parse(localStorage.getItem('grid')) || {};
    grid.lng = parseFloat(grid.lng) || -122.43877;
    grid.lat = parseFloat(grid.lat) || 37.75152;
    grid.zoom = parseFloat(grid.zoom) || 11.0;
    grid.minHeight = parseFloat(grid.minHeight) || 0;
    grid.maxHeight = parseFloat(grid.maxHeight) || 0;
    return grid;
}

function saveSettings() {
    grid.zoom = map.getZoom();
    localStorage.setItem('grid', JSON.stringify(grid));
}

function Create2DArray(rows, def = null) {
    let arr = new Array(rows);
    for (let i = 0; i < rows; i++) {
        arr[i] = new Array(rows).fill(def);
    }
    return arr;
}

function togglePanel() {
    let panel = document.getElementById('infopanel');
    let icon = document.getElementById('panelicon');
    let isOpen = panel.classList.contains('slide-in');

    panel.setAttribute('class', isOpen ? 'slide-out' : 'slide-in'); // removes also the hidden class!
    icon.setAttribute('class', isOpen ? 'fas fa-info-circle' : 'fa fa-angle-left');

    if (!isOpen) {
        getHeightmap(2);
    }
}

function calcMinMaxHeight(heightmap, xOffset, yOffset) {
    let minHeight = 10000;
    let maxHeight = -10000;

    // iterate over the heightmap
    for (let y = 0; y < 2048; y++) {
        if (y < yOffset || y > 1081 + yOffset) continue;
        for (let x = 0; x < 2048; x++) {
            if (x < xOffset || x > 1081 + xOffset) continue;
            let h = heightmap[y][x] / 10;
            if (h > maxHeight) maxHeight = h;
            if (h < minHeight) minHeight = h;
        }
    }

    grid.minHeight = minHeight;
    grid.maxHeight = maxHeight;
}

function updateInfopanel() {
    document.getElementById("lng").innerHTML = grid.lng.toFixed(5);
    document.getElementById("lat").innerHTML = grid.lat.toFixed(5);
    document.getElementById("minh").innerHTML = grid.minHeight;
    document.getElementById("maxh").innerHTML = grid.maxHeight;
}


function zoomIn() {
    map.zoomIn();
}

function zoomOut() {
    map.zoomOut();
}

function getHeightmap(mode = 0) {
    saveSettings(false);
    map.setLayoutProperty('debugLayer', 'visibility', 'visible');

    let extent = getExtent(grid.lng, grid.lat, 18);

    let zoom = 12; //1 pixel = 9.5 m

    // find covering tile of top left
    let x = long2tile(extent.topleft[0], zoom);
    let y = lat2tile(extent.topleft[1], zoom);

    // calculate the square we need
    let tileLng = tile2long(x, zoom);
    let tileLat = tile2lat(y, zoom);

    let tileLng2 = tile2long(x + 4, zoom);
    let tileLat2 = tile2lat(y + 4, zoom);

    // debug: find size of the tiles
    let distance = turf.distance(turf.point([tileLng, tileLat]), turf.point([tileLng, tileLat2]), { units: 'kilometers' }) - 0.4;
    // debug: update the download area
    let debugGrid = turf.squareGrid([tileLng, tileLat, tileLng2, tileLat2], distance / 4, { units: 'kilometers' });
    map.getSource('debug').setData(debugGrid);

    // find out position of the area we want inside the tiles
    let topDistance = turf.distance(turf.point([tileLng, tileLat]), turf.point([tileLng, extent.topleft[1]]), { units: 'kilometers' });
    let leftDistance = turf.distance(turf.point([tileLng, tileLat]), turf.point([extent.topleft[0], tileLat]), { units: 'kilometers' });

    let xOffset = Math.floor(leftDistance / distance * 2048);
    let yOffset = Math.floor(topDistance / distance * 2048);

    // create 4 x 4 empty array
    let tiles = Create2DArray(4);

    // download the tiles
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let url = 'https://api.mapbox.com/v4/mapbox.terrain-rgb/' + zoom + '/' + (x + i) + '/' + (y + j) + '@2x.pngraw?access_token=' + mapboxgl.accessToken;

            PNG.load(url, function (png) {
                tiles[i][j] = png;
            });
        }
    }

    // wait for the download to complete
    let ticks = 0;
    let timer = setInterval(function () {
        ticks++;

        if (isDownloadComplete(tiles)) {
            clearInterval(timer);
            let heightmap = toHeightmap(tiles);
            let canvas, url;
            calcMinMaxHeight(heightmap, xOffset, yOffset);
            if (!scope.seaLevel) scope.seaLevel = Math.floor(grid.minHeight);
            if (!scope.heightScale) scope.heightScale = (1024 / (grid.maxHeight - scope.seaLevel)).toFixed(1);
            switch (mode) {
                case 0:
                    let citiesmap = toCitiesmap(heightmap, xOffset, yOffset);
                    download('heightmap.raw', citiesmap);
                    break;
                case 1:
                    canvas = heightmapToCanvas(heightmap, xOffset, yOffset);
                    url = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                    download('heightmap.png', null, url);
                    break;
                case 2:
                    updateInfopanel();
                    break;
                case 255:
                    canvas = toCanvas(tiles);
                    url = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                    download('tiles.png', null, url);
                    break;
            }
            console.log('complete in ', ticks * 10, ' ms');
        }

        // timeout!
        if (ticks >= 250) {
            clearInterval(timer);
            console.log('timeout');
        }
    }, 10);
}

function autoSettings() {
    getHeightmap(2);
    scope.seaLevel = Math.floor(grid.minHeight);
    scope.heightScale = (1024 / (grid.maxHeight - scope.seaLevel)).toFixed(1);
}

function isDownloadComplete(tiles) {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (!tiles[i][j]) return false;
        }
    }
    return true;
}

function toHeightmap(tiles) {
    let heightmap = Create2DArray(4 * 512, 0);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let tile = tiles[j][i].decode();
            for (let y = 0; y < 512; y++) {
                for (let x = 0; x < 512; x++) {
                    let tileIndex = y * 512 * 4 + x * 4;
                    // resolution 0.1 meters
                    heightmap[i * 512 + y][j * 512 + x] = Math.max(0, -100000 + (tile[tileIndex] * 256 * 256 + tile[tileIndex + 1] * 256 + tile[tileIndex + 2]));
                }
            }
        }
    }
    return heightmap;
}

function toCanvas(tiles) {
    let canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;

    const ctx = canvas.getContext('2d');
    const data = ctx.createImageData(512, 512);

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            tiles[i][j].copyToImageData(data, tiles[i][j].decodePixels());
            ctx.putImageData(data, i * 512, j * 512);
        }
    }

    return canvas;
}

function heightmapToCanvas(heightmap, xOffset, yOffset) {
    let canvas = document.createElement("canvas");
    canvas.width = 1081;
    canvas.height = 1081;

    const ctx = canvas.getContext('2d');
    let img = ctx.getImageData(0, 0, 1081, 1081);

    console.log(scope.seaLevel, parseFloat(scope.heightScale));

    // iterate over the heightmap
    for (let y = 0; y < 2048; y++) {
        if (y < yOffset || y > 1081 + yOffset) continue;
        for (let x = 0; x < 2048; x++) {
            if (x < xOffset || x > 1081 + xOffset) continue;

            // scale the height, an integer in 0.1 meter resolution
            let h = Math.min(255, Math.floor((heightmap[y][x] / 10 - scope.seaLevel) / 4 * parseFloat(scope.heightScale))); // to 4 meters resolution, max is 1023m.

            // calculate index in image
            let index = (y - yOffset) * 1081 * 4 + (x - xOffset) * 4;

            // create pixel
            img.data[index + 0] = h; // heightmap[y, x] / 10;  // red
            img.data[index + 1] = h;    // green
            img.data[index + 2] = h;    // blue
            img.data[index + 3] = 255;  //alpha, 255 is full opaque
        }
    }

    ctx.putImageData(img, 0, 0);

    return canvas;
}

function toCitiesmap(heightmap, xOffset, yOffset) {
    // cities has L/H byte order
    let citiesmap = new Uint8ClampedArray(2 * 1081 * 1081);

    // iterate over the heightmap
    for (let y = 0; y < 2048; y++) {
        if (y < yOffset || y > 1081 + yOffset) continue;
        for (let x = 0; x < 2048; x++) {
            if (x < xOffset || x > 1081 + xOffset) continue;

            // scale the height, taking seaLevel and scale into account 
            let height = Math.round((heightmap[y][x] / 10 - scope.seaLevel) / 0.015625 * parseFloat(scope.heightScale));

            // calculate index in image
            let index = (y - yOffset) * 1081 * 2 + (x - xOffset) * 2;

            // cities used hi/low 16 bit
            citiesmap[index + 0] = height >> 8;
            citiesmap[index + 1] = height & 255;
        }
    }

    // marker, upper left corner
    citiesmap[0] = 255;
    citiesmap[1] = 255;
    citiesmap[2] = 0;
    citiesmap[3] = 0;

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