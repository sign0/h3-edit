var CENTER = [2.3859, 48.8500];
var ZOOM = 12.5;
var RESOLUTION = 7;
var MOUSEH3 = h3.geoToH3(CENTER[1], CENTER[0], RESOLUTION);
var MOUSECOORDS = null;
var CELLSTROKEOPACITY = .33;
var CELLFILLOPACITY = 0;
var CELLSTROKERGBA = [255, 165, 0];
var CELLSTROKE = "rgba("+CELLSTROKERGBA[0]+","+CELLSTROKERGBA[1]+","+CELLSTROKERGBA[2]+","+CELLSTROKEOPACITY+")";
var CELLFILLRGBA = [255, 165, 0];
var CELLFILL = "rgba("+CELLFILLRGBA[0]+","+CELLFILLRGBA[1]+","+CELLFILLRGBA[2]+","+CELLFILLOPACITY+")";
//var IDXGRID = {};
var TILES = {};

var HASHDEMO = [
	"871fb4662ffffff",
	"871fb4663ffffff",
	"871fb4660ffffff",
	"881fb4662bfffff",
	"881fb46629fffff",
	"881fb4662dfffff",
	"881fb46625fffff",
	"881fb46627fffff",
	"881fb46623fffff",
	"881fb46621fffff",
	"891fb4662b7ffff",
	"891fb4662b3ffff",
	"891fb4662bbffff",
	"891fb4662abffff",
	"891fb4662afffff",
	"891fb4662a7ffff",
	"891fb4662a3ffff",
	"861fb4667ffffff",
];

var defaultsHash = {};

for (var i in HASHDEMO) {
	defaultsHash[HASHDEMO[i]] = {
		"type": "Feature",
		"geometry": h3.h3ToGeo(HASHDEMO[i], true)
	}
}

var h3Dataset = {};

/*
//
*/

var image = new ol.style.Circle({
	radius: 5,
	fill: null,
	stroke: new ol.style.Stroke({color: 'red', width: 1})
});	

var styles = {
	'Point': new ol.style.Style({
		image: image
	}),
	'LineString': new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'green',
			width: 1
		})
	}),
	'MultiLineString': new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'green',
			width: 1
		})
	}),
	'MultiPoint': new ol.style.Style({
		image: image
	}),
	'MultiPolygon': new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'yellow',
			width: 1
		}),
		fill: new ol.style.Fill({
			color: 'rgba(255, 255, 0, 0.1)'
		})
	}),
	'Polygon': new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: "rgba(255, 165, 0, .33)",
			lineDash: [15],
			width: 10
		}),
		fill: new ol.style.Fill({
			color: 'rgba(255, 255, 0, 0.0)'
		})
	}),
	'GeometryCollection': new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'magenta',
			width: 2
		}),
		fill: new ol.style.Fill({
			color: 'magenta'
		}),
		image: new ol.style.Circle({
			radius: 10,
			fill: null,
			stroke: new ol.style.Stroke({
				color: 'magenta'
			})
		})
	}),
	'Circle': new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: 'red',
			width: 2
		}),
		fill: new ol.style.Fill({
			color: 'rgba(255,0,0,0.2)'
		})
	})
};

var styleFunction = function(feature) {
	return styles[feature.getGeometry().getType()];
};

/*
//
*/

var layerOSM = new ol.layer.Tile({
	name: "OSMBW",
	type: "base",
	visible: true,
	source: new ol.source.XYZ({
		url: "http://{a-c}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png",
		//crossOrigin: 'anonymous'
	}),
	renderMode: "image",
});

var layerMousePosition = new ol.layer.Vector({
	name: "mousePosition",
	type: "base",
	visible: true,
	source: new ol.source.Vector({
		features: [
			new ol.Feature({
				geometry: new ol.geom.Point(ol.proj.fromLonLat(CENTER)),
				id: "targetMouse"
			})
		]
	}),
	renderMode: "vector",
	style: styleFunction,
});

var layerCells = new ol.layer.Vector({
	name: "cells",
	type: "base",
	visible: true,
	source: new ol.source.Vector({
		features: []
	}),
	style: styleFunction,
	renderMode: "image",
	renderBuffer: 1024
});

var map = new ol.Map({
	controls: ol.control.defaults({
		attributionOptions: {
			collapsible: false
		}
	}).extend([]),
	layers: [
		layerOSM,
		layerMousePosition,
		layerCells,
	],
	target: "map",
	view: new ol.View({
		center: ol.proj.fromLonLat(CENTER),
		zoom: ZOOM,
	}),
  interactions: new ol.interaction.defaults().extend([
  	//new ol.interaction.Draw({
  	//	source: layerCells
  	//})
  ])
});

/*
//
*/

var hex2Rgba = function(hex, opactity){
  var c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
    c = hex.substring(1).split("");
    if(c.length== 3){
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = "0x" + c.join("");
    if (opactity === undefined || opactity === null || opactity > 1 || opactity < 0) opactity = 1;
    return "rgba("+[(c>>16)&255, (c>>8)&255, c&255].join(",")+","+opactity+")";
  }
  throw new Error('Bad Hex');
};

var polygonH3To4326 = function(coords) {
	for (var i in coords) {
		coords[i] = ol.proj.fromLonLat(coords[i]);
	}
	return coords;
};

var updateHexCursor = function(lat, lon, resolution) {
	var hash = h3.geoToH3(lat||centerInit[1], lon||centerInit[0], resolution||RESOLUTION);
	if (MOUSEH3 !== hash) {
		MOUSEH3 = hash;
		var hexagon = h3.h3ToGeoBoundary(hash, true);
		map.getLayers().forEach(function(layer) {
			if (layer.get("name") === "mousePosition") {
				var polygon = new ol.geom.Polygon([polygonH3To4326(hexagon)]);
				layer.getSource().getFeatures()[0].set("hash", hash);
				layer.getSource().getFeatures()[0].setGeometry(polygon);
				console.log("[CURSOR]", "R"+RESOLUTION, hash);
			}
		});
	}
};



map.on("pointermove", function(evt) {
	if (evt.dragging) return;
	MOUSECOORDS = evt.coordinate;
	var point3857To4326 = ol.proj.transform(evt.coordinate, "EPSG:3857", "EPSG:4326");
	updateHexCursor(point3857To4326[1], point3857To4326[0]);
});




var currentTool = "add";

var toolAdd = function() {
  $("#tool-button-add").addClass("panel-icon-tool-selected");
  $("#tool-button-remove").removeClass("panel-icon-tool-selected");
  $("#tool-button-move").removeClass("panel-icon-tool-selected");
  currentTool = "add";
};

var toolRemove = function() {
  $("#tool-button-add").removeClass("panel-icon-tool-selected");
  $("#tool-button-remove").addClass("panel-icon-tool-selected");
  $("#tool-button-move").removeClass("panel-icon-tool-selected");
  currentTool = "remove";
};




var resolutionForm = document.getElementById("resolution");
resolutionForm.addEventListener("change", function(event) {
	console.log("FORM", event);
	RESOLUTION = event.target.valueAsNumber;
});



map.on("singleclick", _.debounce(function(evt) {
	if (evt.originalEvent.shiftKey === true || currentTool === "add") {
		map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
			insertCell(feature);
		});
	} else if (currentTool === "remove") {
		map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
			//console.log(feature, h3.h3GetResolution(feature.get("hash")), RESOLUTION)
			if (h3.h3GetResolution(feature.get("hash")) === RESOLUTION) {
				removeCell(feature);
			}
		});
	} else {
		//
	}
}, 10));




document.addEventListener("keydown", function(event) {
	if (event.which === 81) { // KEY Q : RESOLUTION DOWN
		if (RESOLUTION<15) RESOLUTION+=1;
		document.getElementById("resolution").value = RESOLUTION;
		console.log("[RESOLUTION]", "R"+(RESOLUTION-1), "to", "R"+RESOLUTION);
	}
	if (event.which === 87) { // KEY W : RESOLUTION UP
		if (RESOLUTION>0) RESOLUTION+=-1;
		document.getElementById("resolution").value = RESOLUTION;
		console.log("[RESOLUTION]", "R"+(RESOLUTION+1), "to", "R"+RESOLUTION);
	}
});




var insertCell = function(feature) {
	var hash = feature.get("hash");
	if (hash && h3.h3IsValid(hash) && !h3Dataset[hash]) {
		var projOl = feature.getGeometry().getCoordinates();
		var proj84 = [[]];
		for (var i in projOl[0]) {
			proj84[0][i] = ol.proj.transform(projOl[0][i], 'EPSG:3857', 'EPSG:4326')
		}
		//console.log("feature:", proj84);
		var cell = feature.clone();
		var cellStyle = new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: CELLSTROKE,
				lineDash: [8],
				width: 5
			}),
			fill: new ol.style.Fill({
				color: CELLFILL
			}),
			text: new ol.style.Text({
				font: "16px Quicksand, sans-serif",
				text: feature.get("hash"),
				fill: new ol.style.Fill({
					color: "rgba(0, 0, 0, .66)"
				}),
					stroke: new ol.style.Stroke({
					color: "rgba(255, 255, 255, .66)",
					width: 6
				})
			})
		});
		cell.setStyle(cellStyle);
		layerCells.getSource().addFeature(cell);
		h3Dataset[cell.get("hash")] = cell;
		h3String += hash+"\n";
		$("textarea#h3").text(h3String);
		var geosjon = JSON.parse(h3Geojson);
		geosjon.features.push({
			"type": "Feature",
			"geometry": {
				"type": "Polygon",
				"coordinates": proj84,
			},
			"properties": {
				"h3": hash,
			},
		});
		h3Geojson = JSON.stringify(geosjon);
		$("textarea#geojson").text(h3Geojson);
		console.log("[CELL]:", cell.get("hash"), "cell added");
	}
};


var removeCell = function(feature) {
	h3String = h3String.replace(feature.get("hash")+"\n", "");
	$("textarea#h3").text(h3String);
	layerCells.getSource().removeFeature(feature);
	delete h3Dataset[feature.get("hash")];
	var tmpGeojson = JSON.parse(h3Geojson);
	var newTmpGeojson = {"type":"FeatureCollection","features":[]};
	for (var i in tmpGeojson.features) {
		if (tmpGeojson.features[i].properties.h3 !== feature.get("hash")) {
			newTmpGeojson.features.push(tmpGeojson.features[i]);
		}
	}
	h3Geojson = JSON.stringify(newTmpGeojson);
	$("textarea#geojson").text(h3Geojson);
};



















var panel = "h3";

var switchPanel = function(id) {
	if (id === "geojson") {
		panel = id;
		$("#geojson").show();
		$("#h3").hide();
		$("#edit").hide();
	}
	if (id === "h3") {
		panel = id;
		$("#h3").show();
		$("#geojson").hide();
		$("#edit").hide();
	}
	if (id === "edit") {
		panel = id;
		$("#edit").show();
		$("#h3").hide();
		$("#geojson").hide();
	}
};

var h3String = "";
var h3Geojson = "{\"type\":\"FeatureCollection\",\"features\":[]}";

for (var hash in defaultsHash) {
	var hexagon = h3.h3ToGeoBoundary(hash, true);
	var polygon = new ol.geom.Polygon([polygonH3To4326(hexagon)]);
	var feature = new ol.Feature({
		geometry: polygon,
		id: hash
	});
	feature.values_.hash = hash;
	insertCell(feature);
}

//871fb4660ffffff
$("textarea#h3").bind("input propertychange", function(evt) {
	if (panel === "h3") {
		var newVal = $("textarea#h3").val();
		if (newVal !== h3String) {
			var splitted = h3String.split("\n");
			//console.log("splitted", splitted)
			for (var i in splitted) {
				if (newVal.match(splitted[i])[0] !== "") {
					//console.log("MATCH");
				} else {
					//console.log("UNMATCH");
				}
			}
		}
	}
});

$("textarea#geojson").bind("input propertychange", function(evt) {
	if (panel === "geojson") console.log("evt:", evt, $("textarea#geojson").val());
});

//switchPanel("h3");
switchPanel("edit");

var openPanel = function() {
  $("#panel-open-button").hide();
	$("#panel").animate({
    right: "0px",
  }, 666, function() {
  	//
  });
};

var closePanel = function() {
	$("#panel").animate({
    right: "-425px",
  }, 666, function() {
    $("#panel-open-button").show();
  });
};


$("#fill").spectrum({
  move: function(tinycolor) {
  	CELLFILLRGBA = [Math.round(tinycolor._r),Math.round(tinycolor._g),Math.round(tinycolor._b)];
		CELLFILL = "rgba("+CELLFILLRGBA[0]+","+CELLFILLRGBA[1]+","+CELLFILLRGBA[2]+","+CELLFILLOPACITY+")";
  },
  showPaletteOnly: true,
  togglePaletteOnly: true,
  togglePaletteMoreText: "more",
  togglePaletteLessText: "less",
  color: "orange",
  palette: [
    ["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
    ["#f00","orange","#ff0","#0f0","#0ff","#00f","#90f","#f0f"],
    ["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc"],
    ["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd"],
    ["#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0"],
    ["#c00","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79"],
    ["#900","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"],
    ["#600","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4c1130"]
  ]
});

$("#stroke").spectrum({
  move: function(tinycolor) {
  	CELLSTROKERGBA = [Math.round(tinycolor._r),Math.round(tinycolor._g),Math.round(tinycolor._b)];
		CELLSTROKE = "rgba("+CELLSTROKERGBA[0]+","+CELLSTROKERGBA[1]+","+CELLSTROKERGBA[2]+","+CELLSTROKEOPACITY+")";
  },
  showPaletteOnly: true,
  togglePaletteOnly: true,
  togglePaletteMoreText: "more",
  togglePaletteLessText: "less",
  color: "orange",
  palette: [
    ["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
    ["#f00","orange","#ff0","#0f0","#0ff","#00f","#90f","#f0f"],
    ["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc"],
    ["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd"],
    ["#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0"],
    ["#c00","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79"],
    ["#900","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"],
    ["#600","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4c1130"]
  ]
});

var addCellFillOpacity = function() {
	if (CELLFILLOPACITY+.1 < 1) CELLFILLOPACITY = CELLFILLOPACITY+.1;
	else CELLFILLOPACITY = 1;
	CELLFILL = "rgba("+CELLFILLRGBA[0]+","+CELLFILLRGBA[1]+","+CELLFILLRGBA[2]+","+CELLFILLOPACITY+")";
	$("#fill-opacity-value").val(CELLFILLOPACITY);
};

var removeCellFillOpacity = function() {
	if (CELLFILLOPACITY-.1 > 0) CELLFILLOPACITY = CELLFILLOPACITY-.1;
	else CELLFILLEOPACITY = 0;
	CELLFILL = "rgba("+CELLFILLRGBA[0]+","+CELLFILLRGBA[1]+","+CELLFILLRGBA[2]+","+CELLFILLOPACITY+")";
	$("#fill-opacity-value").val(CELLFILLOPACITY);
};

var addCellStrokeOpacity = function() {
	if (CELLSTROKEOPACITY+.1 < 1) CELLSTROKEOPACITY = CELLSTROKEOPACITY+.1;
	else CELLSTROKEOPACITY = 1;
	CELLSTROKE = "rgba("+CELLSTROKERGBA[0]+","+CELLSTROKERGBA[1]+","+CELLSTROKERGBA[2]+","+CELLSTROKEOPACITY+")";
	$("#stroke-opacity-value").val(CELLSTROKEOPACITY);
};

var removeCellStrokeOpacity = function() {
	if (CELLSTROKEOPACITY-.1 > 0) CELLSTROKEOPACITY = CELLSTROKEOPACITY-.1;
	else CELLSTROKEOPACITY = 0;
	CELLSTROKE = "rgba("+CELLSTROKERGBA[0]+","+CELLSTROKERGBA[1]+","+CELLSTROKERGBA[2]+","+CELLSTROKEOPACITY+")";
	$("#stroke-opacity-value").val(CELLSTROKEOPACITY);
};

var addResolution = function() {
	if (RESOLUTION<15) RESOLUTION+=1;
	document.getElementById("resolution").value = RESOLUTION;
	console.log("[RESOLUTION]", "R"+(RESOLUTION-1), "to", "R"+RESOLUTION);
};

var removeResolution = function() {
	if (RESOLUTION>0) RESOLUTION+=-1;
	document.getElementById("resolution").value = RESOLUTION;
	console.log("[RESOLUTION]", "R"+(RESOLUTION+1), "to", "R"+RESOLUTION);
};








