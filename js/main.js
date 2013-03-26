var _map;
// dynamic access to the data API
var _dataUrl = 'http://datastore.opendatasoft.com/iledefrance2030/api/records/1.0/search?dataset={dataset}&rows={rows}&callback=?';

// IdF bounds for basic location validation 
var _idfBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(48.12008110, 1.446170),
    new google.maps.LatLng(49.2415040, 3.55900690)
);

// TODO: dynamic loading like constraints and objectives
var _types = {
    "maison": {
        "name": "Maisons individuelles",
        "objective": "habitat",
        "advice": "Les maisons individuelles consomment plus de foncier que les logements collectifs, au détriment des espaces naturels, de l'emploi et des équipements",
        "value": 200,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#ff649e"
        }
    },
    "petitCollectif": {
        "name": "Petits collectifs",
        "objective": "habitat",
        "advice": "Les logements en petits collectifs sont très adaptés aux centres bourgs, moins aux zones centrales",
        "value": 1000,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#f5005c"
        }
    },
    "grandCollectif": {
        "name": "Grands collectifs",
        "objective": "habitat",
        "advice": "Les logements en grands collectifs sont adaptés aux zones centrales et à proximité des gares",
        "value": 5000,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#c20049"
        }
    },
    "densification": {
        "name": "Densification",
        "objective": "habitat",
        "advice": "La densification permet de reconstruire la ville sur la ville et d'éviter de consommer des espaces naturels",
        "value": 2500,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#a10686"
        }
    },
    
    "usine": {
        "name": "Industrie",
        "objective": "emploi",
        "advice": "Les emplois industriels doivent plutôt se situer à proximité des zones logistiques",
        "value": 500,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#4ca4ff"
        }
    },
    "tertiaire": {
        "name": "Services",
        "objective": "emploi",
        "advice": "Les emplois de services génèrent assez peu de nuisances, vous pouvez les installer à proximité des zones d'habitat et, de préférence, à proximité des transports en commun pour limiter l'utilisation de la voiture",
        "value": 1000,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#027fff"
        }
    },
    "artisanat": {
        "name": "Artisanat",
        "objective": "emploi",
        "value": 500,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#0060c3"
        }
    },
    
    "culture": {
        "name": "Culture",
        "objective": "equipement",
        "value": 2500,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#ffc34f"
        }
    },
    "ecole": {
        "name": "École / Enseignement",
        "objective": "equipement",
        "value": 5000,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#ffa800"
        }
    },
    "social": {
        "name": "Centre social de proximité",
        "objective": "equipement",
        "advice": "Les centres sociaux et culturels ont par essence vocation à se trouver à proximité des logements",
        "value": 1000,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#d68d00"
        }
    },
    
    "agriculture": {
        "name": "Agriculture",
        "objective": "espace_vert",
        "advice": "L'agriculture représente 53% de la superficie de l'Ile de France, c'est une richesse !",
        "value": 2500,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#90ff6e"
        }
    },
    "parcs": {
        "name": "Parcs",
        "objective": "espace_vert",
        "advice": "Les parcs et jardins ont vocation à être situés à proximité des logements",
        "value": 5000,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#36e600"
        }
    },
    "forets": {
        "name": "Forets",
        "objective": "espace_vert",
        "advice": "La forêt est précieuse, préservons-la !",
        "value": 5000,
        "cellSize": 500,
        "polygonOptions": {
            fillColor: "#2a930a"
        }
    }
}
var _globalPolygonOptions = {
    draggable: true,
    strokeWeight: 0,
    fillOpacity: 0.8
}

var _dm, _cm;
function queryData(opts, callback) {
    // var $.extend();
    $.getJSON(utils.template(_dataUrl, opts), callback);
}

var _currentType = null;
var _elements = { };

function buildSquare(center, meterSide, options) {
    var diagShift = Math.sqrt(meterSide*meterSide + meterSide*meterSide) / 2;

    return new google.maps.Rectangle({bounds: new google.maps.LatLngBounds(
        google.maps.geometry.spherical.computeOffset(center, diagShift, 225),
        google.maps.geometry.spherical.computeOffset(center, diagShift, 45)
    )});
}

function setElementType(elementType) {
    _currentType = elementType;
    var t = _types[_currentType];
    if(t && t.advice) {
        $('#message').html('Conseil : '+t.advice).slideDown('fast');
    } else 
        $('#message').html('').hide();
//    _dm.setOptions({
//        map: _map,
//        polygonOptions: _types[_elementType].polygonOptions,
//        markerOptions: _types[_elementType].markerOptions
//    });
}


function getInfoBoxContent(elt, type) {
    var content = '<h2>'+type.name+'</h2>';
    if (elt.failedConstraints && elt.failedConstraints.length > 0) {
        content += '<p>Problèmes</p><ul>';
        for(var i=0;i<elt.failedConstraints.length;i++) {
            content += '<li>'+elt.failedConstraints[i].msg+'</li>';
        }
        content += '</ul>';
    }
    content += '<div style="border-top:1px solid silver;text-align:right;"><a id="deleteElt" href="javascript:void(0)">Supprimer</a></div>'
    return content;
}


function addElement(type, layer, checkConstraint) {
    if(!_elements[type]) {
        _elements[type] = [];
    }
    var elts = _elements[type];
    var newElt = {
        type:type,
        name:type+'_'+elts.length,
        geom:layer,
        failedConstraints: []
    };
    elts.push(newElt);
    google.maps.event.addListener(newElt.geom, 'click', function(e) {
        _iw.setOptions({
            content: getInfoBoxContent(newElt, _types[type]),
            position: e.latLng
        });
        _iw.open(_map);
        setTimeout(function() {
            $('#deleteElt').on('click', function(event) {
                var removedElt = elts.splice(elts.indexOf(newElt), 1);
                removedElt[0].geom.setMap(null);
                if(_types[type]) {
                    _om.increment(_types[type].objective, -(_types[type].value));
                }
                _iw.close();
                event.stopPropagation();
            });
        }, 500);
    });
    if(_types[type]) {
        _om.increment(_types[type].objective, _types[type].value);
    }
    if(checkConstraint) {
        checkConstraints();
    }
}

var _iw = new InfoBox({
    alignBottom: true,
    maxWidth:400,
    pixelOffset: new google.maps.Size(0, -10),
    infoBoxClearance: new google.maps.Size(15, 15)
});
    
function checkConstraints() {
    // TODO: loading indicator
    for(var eltType in _elements) {
        var elts = _elements[eltType];
        for(var i=0, l=elts.length;i<l;i++) {
            elts[i].failedConstraints = [];
        }
    }

    _cm.checkConstraints(_elements, function(elt, constraint, isValid) {
        if(!isValid) {
            elt.failedConstraints.push(constraint);
        }
    });
    
    for(var eltType in _elements) {
        var elts = _elements[eltType];
        for(var i=0, l=elts.length;i<l;i++) {
            if(elts[i].failedConstraints.length > 0) {  // the element failed to validate some constraints
                elts[i].geom.setOptions({
                    strokeWeight: 3,
                    fillOpacity: 1
                });
            } else {
                elts[i].geom.setOptions({
                    strokeWeight: 0,
                    fillOpacity: 0.8
                });               
            }
        }
    }
}




$(function(){
    _om = new ObjectiveManager('data/objectives.json');
    _cm = new ConstraintManager('data/constraints.json');
    
    _map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(49.0,2.57),
        zoom: 12,
        minZoom: 7,
        maxZoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        mapTypeControl: false,
        scaleControl: true,
        scaleControlOptions: {position: google.maps.ControlPosition.RIGHT_BOTTOM},
        disableDefaultUI: true
    });
    // Black & white Google Maps background
    _map.mapTypes.set('bw', new google.maps.StyledMapType([
        { featureType: 'all', elementType: 'all', stylers: [{ saturation: -100, gamma: 0.50}]},
        { featureType: "all", elementType: "labels", stylers: [{ visibility: "off"}] },
        { featureType: "road", elementType: "all", stylers: [{ visibility: "off"}] },
        { "featureType": "road.highway", "elementType": "geometry", "stylers": [ { "visibility": "on" }, {"hue": "#f00000"} ] },    
        { featureType: "water", elementType: "labels", stylers: [{ visibility: "off"}] },
        { featureType: "administrative.neighborhood", elementType: "all", stylers: [{ visibility: "off"}] },
        { featureType: "landscape.man_made", elementType: "all", stylers: [{ visibility: "off"}] },
        { featureType: "administrative.locality", elementType: "labels", stylers: [{ visibility: "on"}] },
        { "featureType": "administrative", "elementType": "geometry", "stylers": [ { "visibility": "on" }, { "invert_lightness": true } ] },
        { "featureType": "transit.line", "elementType": "geometry", "stylers": [ { "color": "#ff8080" } ] }   
    ], { name: 'bw' }));
    _map.setMapTypeId('bw');
//        
//     _map.mapTypes.set('sdrif', new google.maps.StyledMapType([
//     { "stylers": [ { "visibility": "off" } ] },
//     { "elementType": "labels", "stylers": [ { "visibility": "off" } ] },
//     { "featureType": "landscape.man_made", "stylers": [ { "visibility": "on" }, { "color": "#dddddd" } ] },
//     { "featureType": "road.highway", "elementType": "geometry", "stylers": [ { "visibility": "on" }, {"hue": "#f00000"} ] },
//     { "featureType": "administrative", "elementType": "geometry", "stylers": [ { "visibility": "on" }, { "invert_lightness": true } ] },
//     { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [ { "visibility": "on" }, { "color": "#ffffff" } ] },
//     { featureType: "water", elementType: "geometry", stylers: [{ visibility: "on"}] },
//     { "featureType": "poi.park", elementType: "geometry", "stylers": [ { "visibility": "on" }, { "color": "#00c800" } ] }],
//     { name: 'sdrif' }));
//    _map.setMapTypeId('sdrif');
    
    
    google.maps.event.addListener(_map, 'click', function(event) {
        _iw.close();
        if(_currentType != null) {
            var cell = buildSquare(event.latLng, _types[_currentType].cellSize);
            cell.setOptions($.extend(_globalPolygonOptions, _types[_currentType].polygonOptions));
            cell.setMap(_map);
            google.maps.event.addListener(cell, 'dragend', function() {
                checkConstraints();
            });
            google.maps.event.addListener(cell, 'dragstart', function() {
                _iw.close();
            });
            addElement(_currentType, cell, true);
        }
    });
    
    // Link type definition to their html elements
    for(var eltType in _types) {
        var domElt = $('#elt_'+eltType)
            .on('click', function() {
                setElementType($(this).attr('id').substring(4));
                $('.sous-liste li').removeClass('selected');
                $(this).addClass('selected');
            })
            .children().first().css({
                'border-right-color': _types[eltType].polygonOptions.fillColor
            });
        domElt.children('.value').children('.v').html(_types[eltType].value);
    }

    
    loadFixedMapData();
    
    
    // Geocodage
    var geocoder = new google.maps.Geocoder();
    function geocode() {
        var addrString = $('#address').val().trim();
        if(addrString != '') {
            geocoder.geocode({address:addrString, bounds: _idfBounds}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var result = results[0];
                    if(_idfBounds.contains(result.geometry.location))
                        _map.fitBounds(results[0].geometry.viewport);
                    else {
                        $('#address').select();
                        alert('Cette localité n\'est pas en Île-de-France'); 
                    }
                }
            });
        }
    }
    $('#address').on('change', function() { geocode(); });
    $('#location').on('submit', function(e) {
        geocode();
        e.preventDefault();
    });
});


// Some general purpose functions
// (mostly geom manipulation for constraint checks)
var utils = {
    getPolyBounds : function(polygon) {
        if(polygon instanceof google.maps.Rectangle) 
            return polygon.getBounds();
        var bb = new google.maps.LatLngBounds();
        var p = polygon.getPath();
        for(var i=0, l=p.getLength();i<l; i++) {
            bb.extend(p.getAt(i));
        }
        return bb;
    },
    getPolyCenter : function(polygon) {
        return utils.getPolyBounds(polygon).getCenter();
    },
    getOverlayCenter : function(a) {
        return (a instanceof google.maps.Marker) ?
            a.getPosition() : ((a instanceof google.maps.Circle) ? 
                a.getCenter() : utils.getPolyCenter(a));
    },
    distanceBetween : function(a, b) {
        var ll1 = utils.getOverlayCenter(a),
            ll2 = utils.getOverlayCenter(b);
        return google.maps.geometry.spherical.computeDistanceBetween(ll1, ll2);
    },
    parseGeoJsonPoint: function(geoJson) {
        return new google.maps.LatLng(geoJson.coordinates[1], geoJson.coordinates[0]);
    },
    isInside: function(a, b) {
        // TODO: Rectangle and Circle
        if(!(b instanceof google.maps.Polygon))
            return false; 
        return google.maps.geometry.poly.containsLocation(utils.getOverlayCenter(a), b);
    },
    // String formatting function
    template: function(s, d) {
        for (var p in d)
            s = s.replace(new RegExp('{' + p + '}', 'g'), d[p]);
        return s;
    }
};



/*
 * Dirty stuff
 * TODO: dynamic configuration of loaded layers (source, format, representation)
 * TODO: Loading process events (start, finish, progress)  
 */
function loadFixedMapData(datasets, bbox) {
    console.log('Chargement des positions des gares…');
    //queryData({dataset: 'idf_CDGT2012_GaresStations', rows:1000},
    $.getJSON('data/gares_idf.json', 
    function(result) {
        var records = result.records;
        $.each(records, function(i, r) {
            var geoj = r.geometry;
            addElement('transports', 
                new google.maps.Marker({
                    map: _map,
                    flat: true,
                    clickable: false,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        strokeColor: '#ff8080',
                        fillColor: 'black',
                        fillOpacity: 1,
                        scale: 3
                    },
                    position: utils.parseGeoJsonPoint(geoj)
                })
            );
        });
        console.log('Gares OK');
    });
    
    console.log('Chargement des pôles logistiques…');
    $.getJSON('data/poles_logistiques_idf.json', 
    function(result) {
        var records = result.records;
        $.each(records, function(i, r) {
            var geoj = r.geometry;
            addElement('logistics', 
                new google.maps.Marker({
                    map: _map,
                    flat: true,
                    clickable: false,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        strokeColor: '#8080ff',
                        fillColor: 'black',
                        fillOpacity: 1,
                        scale: 3
                    },
                    position: utils.parseGeoJsonPoint(geoj)
                })
//                new google.maps.Circle({
//                    map: _map,
//                    clickable: false,
//                    center: utils.parseGeoJsonPoint(geoj),
//                    strokeWeight: 0,
//                    fillColor: '#ff0000',
//                    fillOpacity: 0.3,
//                    radius: 1000
//                })
            );
        });
        console.log('Pôles logistiques OK');
    });
    
    console.log('Chargement des aéroports…');
    $.getJSON('data/airport_buffers_2km.geojson',
    function(result) {
        var polys = new GeoJSON(result, {fillColor: '#07a', strokeWeight:0})[0];
        for(var i=0;i<polys.length;i++) {
            addElement('airports', polys[i]);
            //polys[i].setMap(_map);
        }
        console.log('Aéroports OK');
    });
    
    console.log('Chargement des "tâches urbaines"…');
    $.getJSON('data/zu.geojson',
    function(result) {
        var polys = new GeoJSON(result, {fillColor: '#0a7', strokeWeight:0});
        var poly;
        for(var i=0;i<polys.length;i++) {
            poly = polys[i];
            // Polygons...
            if(poly instanceof google.maps.Polygon) {
                addElement('zu', poly);
                // poly.setMap(_map);
            } else {    // but also MultiPolygons (arrays of google.maps.Polygon)
                for(var j=0;j<poly.length;j++) {
                    addElement('zu', poly[j]);
                    // poly[j].setMap(_map);
                }
            }
        }
        console.log('Tâches urbaines OK');
    });
}






