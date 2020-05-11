(function () {

    'use strict';

    var map; 
    var latitude = 60.170256;
    var longitude = 24.938321;
    var testMarker;
    ///var locationMarkers = [];
    //var locationsLayerGroup;
    var layersControl;
    var mcgLayerSupportGroup = L.markerClusterGroup.layerSupport();
    var xhr = new XMLHttpRequest();
    var loader = document.getElementById('loader');

    var openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    var openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.opentopomap.org/copyright">OpenStreetMap</a>'
    });

    var baseLayers = {
        "OpenStreetMap": openStreetMap,
        "OpenTopoMap": openTopoMap
    };

    var overlayLayers = {
        POSTOFFICE: {
            label: 'Täyden palvelun postit',
            markers: [],
            layerGroup: L.layerGroup([]),
            show: true 
        },
        LETTERBOX: {
            label: 'Kirjelaatikko',
            markers: [],
            layerGroup: L.layerGroup([]),
            show: true
        },
       SMARTPOST: {
            label: 'Postin automaatti',
            markers: [],
            layerGroup: L.layerGroup([]),
            show: true
        },
      PICKUPPOINT: {
        label: 'Noutopiste',
        markers: [],
        layerGroup: L.layerGroup([]),
        show: true
        },
     BUSINESSERVICE: {
        label: 'Yrityspiste',
        markers: [],
        layerGroup: L.layerGroup([]),
        show: true
        },
    POBOX: {
        label: 'Postilokero',
        markers: [],
        layerGroup: L.layerGroup([]),
        show: true
        },
    LOCKER: {
        label: 'Postin automaatti (yksityinen)',
        markers: [],
        layerGroup: L.layerGroup([]),
        show: true
       }
    };

    function setMap()
    {
        // Luodaan kartta elementtiin, jonka id on "map"
        map = L.map('map', {
            center: [latitude, longitude],
            zoom: 14,
            layers: [openStreetMap]
        });
    
       // Add scale control to map 
       L.control.scale().addTo(map);

       // Add layers control to map
       layersControl = L.control.layers(baseLayers).addTo(map);

       // Create marker 
       testMarker = L.marker([latitude, longitude]);
       testMarker.bindTooltip('Tässä on markerin tooltip jee!');
       testMarker.bindPopup('<h1>Jeba jee jee</h1><p>Terve ja kiitos kaloista!</p>');
       testMarker.addTo(map);

       // Loop through overlayLayers and create layers
       for (var prop in overlayLayers)
       {
           // Create layer if show is true 
           if (overlayLayers[prop].show)
           {
               map.addLayer(overlayLayers[prop].layerGroup);
           }
       }

       // Add mcg layer support group
       mcgLayerSupportGroup.addTo(map);

       // Map zoom end event handler 
       map.on('zoomend', function() {
           console.log('Karttaa zoomattiin');
           getLocations(map.getBounds());
       });

       // Map move end event handler 
       map.on('moveend', function() {
           console.log('Karttaa siirrettin');
           getLocations(map.getBounds());
       });

    }

    /**
     * Creates markers and layers on the map and layer control.
     * @param {array} locations 
     */
    function setOverlayLayers(locations)
    {
        // Loop through overlayLayers and clear existing markers 
        for (var prop in overlayLayers)
        {
            overlayLayers[prop].markers = [];
        }

        // Loop through locations array
        for (var i = 0; i < locations.length; i++)
        {
            // Skip if type not defined in overlayLayers
            if (! overlayLayers[locations[i].type])
            {
                continue;
            }

            // Create marker
            var locationMarker = L.marker([locations[i].location.lat, locations[i].location.lon]);

            // Add tooltip to marker
            if (locations[i].publicName)
            {
                locationMarker.bindTooltip(locations[i].publicName.fi);
            }

            // Set marker icons for different location types 
            var iconPath = 'images/images/icon-' + locations[i].type.toLowerCase() + '.svg';

            locationMarker.setIcon(L.icon({
                iconUrl: iconPath, 
                iconSize: [40, 52],
                iconAnchor: [20, 52],
                tooltipAnchor: [18, -34]
            }));

           // Add marker to array
           overlayLayers[locations[i].type].markers.push(locationMarker);
        }

        // loop through overlayLayers and create layers and controls 
        for (var prop in overlayLayers)
        {
            // Remove layers and controls if they exist already
            if (map.hasLayer(overlayLayers[prop].layerGroup))
            {
                map.removeLayer(overlayLayers[prop].layerGroup);
                overlayLayers[prop].show = true;
            }
            else 
            {
                overlayLayers[prop].show = false;
            }

        // Remover overlay layer control
        layersControl.removeLayer(overlayLayers[prop].layerGroup);

        // Create layer group from array 
        overlayLayers[prop].layerGroup = L.layerGroup(overlayLayers[prop].markers);

        // Add layer to marker cluster layer support group
        mcgLayerSupportGroup.checkIn(overlayLayers[prop].layerGroup);

        // Add layer to map if show is true 
        if (overlayLayers[prop].show)
        {
            map.addLayer(overlayLayers[prop].layerGroup);
        }

        // Add overlay layer to layers control
        layersControl.addOverlay(overlayLayers[prop].layerGroup, overlayLayers[prop].label);
        }

        // Hide loader 
        loader.classList.add('hide');
    }

    function setMyLocationMarker(position)
    {
        //console.log(position);

        // Update latitude and longitude from position object 
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        var myLocationIcon = L.divIcon({
            className: 'my-location',
            iconSize: [16, 16]
        });

        // Create marker for my location
        var myLocationMarker = L.marker(
            [latitude, longitude],
            {
                icon: myLocationIcon
            }
        );

        myLocationMarker.bindTooltip('Olet tässä!');
        myLocationMarker.addTo(map);

        // Move map to new location
        map.flyTo([latitude, longitude], map.getZoom());
    }

    function geolocationError(error)
    {
        console.error(error.code + ': ' + error.message);
    }

    function getLocations(bounds)
    {
        console.log(bounds);

        loader.classList.remove('hide');

        // Posti API locations endpoint URL
        var url = 'https://locationservice.posti.com/location?';

        // Params to be added to the request URL
        var params = {
            topLeftLat: bounds.getNorthWest().lat,
            topLeftLng: bounds.getNorthWest().lng,
            bottomRightLat: bounds.getSouthEast().lat,
            bottomRightLng: bounds.getSouthEast().lng
        };

        // Loop through params object and add them to the url
        for (var prop in params)
        {
            url += prop + '=' + params[prop] + '&';
        }

        console.log(url);

        xhr.open('GET', url);
        xhr.responseType = 'json';
        xhr.send();
    }


    function xhrLoad()
    {
        //console.log('XHR load ok!');
        if(xhr.status == 200)
        {
            var locations = xhr.response.locations;

            // Check that locations is an array because IE returns a string 
            if (! Array.isArray(locations))
            {
                locations = JSON.parse(locations);
            }

            console.log(locations);

            setOverlayLayers(locations);
        }
        else
        {
            console.error(xhr.status + ': ' + xhr.statusText);
        }
    }

    function xhrError()
    {
        console.error('XHR error!');
    }
  
    setMap();

    xhr.addEventListener('load', xhrLoad);
    xhr.addEventListener('error', xhrError);

    getLocations(map.getBounds());

    // Check if browser supports geolocation
    if (navigator.geolocation)
    {
        var geolocationOptions = {
            enableHighAccuracy: true 
        };

        // Pistetään oma sijainti pois päältä väliaikaisesti 
        //navigator.geolocation.getCurrentPosition(setMyLocationMarker,
        //geolocationError, geolocationOptions);
    }

    var toggleClustering = document.getElementById('toggleClustering');

    // Make sure toggleClustering is checked 
    toggleClustering.checked = true;

    // toggleClustering change event handler
    toggleClustering.onchange = function() {
        if (this.checked)
        {
            mcgLayerSupportGroup.enableClustering();
        }
        else
        {
            mcgLayerSupportGroup.disableClustering();
        }
    };

})();