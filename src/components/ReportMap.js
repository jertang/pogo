// ReportMap.js
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { createClient } from '@supabase/supabase-js'
import 'maplibre-gl/dist/maplibre-gl.css'
import './ReportMap.css'   

// Supabase setup
const supabaseUrl = 'https://yybdwyflzpzgdqanrbpa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YmR3eWZsenB6Z2RxYW5yYnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg0NDYsImV4cCI6MjA2MjQxNDQ0Nn0.P5frBEg6mUQqfYIcGtKDYUSpG-po6wla7zsz3PTgYgw'
const supabase = createClient(supabaseUrl, supabaseKey)

const ReportMap = () => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const tempMarkerRef = useRef(null)
  const searchMarkerRef = useRef(null)
  const geojsonRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })
  const legalCheckpointsRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })
  const allPointsRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })

  const [showForm, setShowForm] = useState(false)
  const [showCheckpointInfo, setShowCheckpointInfo] = useState(false)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [checkpointType, setCheckpointType] = useState('unofficial')
  const [formData, setFormData] = useState({
    checkpoint_type: '',
    agency: '',
    date_observed: '',
    details: '',
    lat: null,
    lng: null,
    verification: '',
    using_technology: false,
    location: '',
    description: '',
    date: '', // for official
  })
  const [visibleLayers, setVisibleLayers] = useState({
    borderStations: true,
    userReports: true,
    official: true,
  })
  // Official date slider state
  const [officialDateLimits, setOfficialDateLimits] = useState(['', ''])
  const [officialDateRange, setOfficialDateRange] = useState(['', ''])
  // Unofficial date slider state
  const [unofficialDateLimits, setUnofficialDateLimits] = useState(['', ''])
  const [unofficialDateRange, setUnofficialDateRange] = useState(['', ''])

  // Store original features for filtering
  const originalUserReportsRef = useRef([])
  const originalOfficialCheckpointsRef = useRef([])

  useEffect(() => {
    // ——————————— Removed dynamic <style> injection ———————————

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:
        'https://api.maptiler.com/maps/0196cd3f-fb75-77c7-b9fc-336a56159c73/style.json?key=6Yi2lIi7fKDCpeBAXoYW',
      center: [-98.5795, 39.8283],
      zoom: 4,
    })

    mapRef.current = map

    // Helper to update allPointsRef and map source
    const updateAllPointsSource = (userFeatures, borderFeatures, officialFeatures) => {
      const allFeatures = [
        ...userFeatures.map((f) => ({ ...f, properties: { ...f.properties, point_type: 'unofficial' } })),
        ...borderFeatures.map((f) => ({ ...f, properties: { ...f.properties, point_type: 'border' } })),
        ...officialFeatures.map((f) => ({ ...f, properties: { ...f.properties, point_type: 'official' } })),
      ]
      allPointsRef.current.features = allFeatures
      if (map.getSource('all_points')) {
        map.getSource('all_points').setData(allPointsRef.current)
      }
    }

    const loadCheckpointReports = async () => {
      const { data, error } = await supabase.from('checkpoint_reports').select('*')
      if (error) {
        console.error('Error fetching checkpoint reports:', error)
        return
      }
      const features = data.map((record) => ({
        type: 'Feature',
        properties: {
          checkpoint_type: record.checkpoint_type,
          agency: record.agency,
          date_observed: record.date_observed,
          details: record.details,
          using_technology: record.using_technology,
          type: 'user_report',
          created_at: record.created_at,
        },
        geometry: {
          type: 'Point',
          coordinates: [record.lng, record.lat],
        },
      }))
      originalUserReportsRef.current = features
      geojsonRef.current.features = features
      map.getSource('places')?.setData(geojsonRef.current)

      // Compute min/max date for unofficial
      const dates = features.map((f) => f.properties.date_observed).filter(Boolean)
      if (dates.length > 0) {
        const min = dates.reduce((a, b) => (a < b ? a : b))
        const max = dates.reduce((a, b) => (a > b ? a : b))
        setUnofficialDateLimits([min, max])
        setUnofficialDateRange([min, max])
      } else {
        setUnofficialDateLimits(['', ''])
        setUnofficialDateRange(['', ''])
      }

      // After loading all, update all_points
      updateAllPointsSource(features, legalCheckpointsRef.current.features, originalOfficialCheckpointsRef.current)
    }

    const loadBorderStations = async () => {
      const { data, error } = await supabase.from('border_stations').select('*')
      if (error) {
        console.error('Error fetching border stations:', error)
        return
      }
      const features = data.map((record) => ({
        type: 'Feature',
        properties: {
          id: record.id,
          checkpoint_name: record.checkpoint_name,
          city: record.city,
          state: record.state,
          description: record.description || '',
          type: 'border_station',
        },
        geometry: {
          type: 'Point',
          coordinates: [record.long, record.lat],
        },
      }))
      legalCheckpointsRef.current.features = features
      map.getSource('border_stations')?.setData(legalCheckpointsRef.current)
      // After loading all, update all_points
      updateAllPointsSource(originalUserReportsRef.current, features, originalOfficialCheckpointsRef.current)
    }

    const loadOfficialCheckpoints = async () => {
      try {
        const { data, error } = await supabase.from('official_checkpoints').select('*')
        if (error) throw error
        const features = data.map((checkpoint) => ({
          type: 'Feature',
          properties: {
            id: checkpoint.id,
            location: checkpoint.location,
            date: checkpoint.date,
            verification: checkpoint.verification,
            description: checkpoint.description,
            agency: checkpoint.agency,
            using_technology: checkpoint.using_technology,
            type: 'official',
          },
          geometry: {
            type: 'Point',
            coordinates: [checkpoint.longitude, checkpoint.latitude],
          },
        }))
        originalOfficialCheckpointsRef.current = features
        if (mapRef.current && mapRef.current.getSource('official_checkpoints')) {
          mapRef.current.getSource('official_checkpoints').setData({
            type: 'FeatureCollection',
            features,
          })
        }

        // Compute min/max date for official
        const dates = features.map((f) => f.properties.date).filter(Boolean)
        if (dates.length > 0) {
          const min = dates.reduce((a, b) => (a < b ? a : b))
          const max = dates.reduce((a, b) => (a > b ? a : b))
          setOfficialDateLimits([min, max])
          setOfficialDateRange([min, max])
        } else {
          setOfficialDateLimits(['', ''])
          setOfficialDateRange(['', ''])
        }

        // After loading all, update all_points
        updateAllPointsSource(originalUserReportsRef.current, legalCheckpointsRef.current.features, features)
      } catch (error) {
        console.error('Error loading official checkpoints:', error)
      }
    }

    map.on('load', () => {
      map.resize()

      // User Reports (Unofficial) - Keep but hide since we use clustered version
      map.addSource('places', {
        type: 'geojson',
        data: geojsonRef.current,
      })
      map.addLayer({
        id: 'placesLayer',
        type: 'circle',
        source: 'places',
        paint: {
          'circle-radius': 8,
          'circle-color': '#B42222', // Red
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000',
        },
        layout: {
          visibility: 'none', // Hide since we use clustered version
        },
      })

      // Border Stations - Keep but hide since we use clustered version
      map.addSource('border_stations', {
        type: 'geojson',
        data: legalCheckpointsRef.current,
      })
      map.addLayer({
        id: 'borderStationsLayer',
        type: 'circle',
        source: 'border_stations',
        paint: {
          'circle-radius': 8,
          'circle-color': '#0047AB', // Blue
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000',
        },
        layout: {
          visibility: 'none', // Hide since we use clustered version
        },
      })

      // Official Checkpoints - Keep but hide since we use clustered version
      map.addSource('official_checkpoints', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'officialCheckpointsLayer',
        type: 'circle',
        source: 'official_checkpoints',
        paint: {
          'circle-radius': 8,
          'circle-color': '#2ecc40', // Green
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000',
        },
        layout: {
          visibility: 'none', // Hide since we use clustered version
        },
      })

      // Add all_points source with clustering and clusterProperties
      map.addSource('all_points', {
        type: 'geojson',
        data: allPointsRef.current,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
        clusterProperties: {
          unofficial_count: [
            '+',
            ['case', ['==', ['get', 'point_type'], 'unofficial'], 1, 0],
          ],
          official_count: [
            '+',
            ['case', ['==', ['get', 'point_type'], 'official'], 1, 0],
          ],
          border_count: [
            '+',
            ['case', ['==', ['get', 'point_type'], 'border'], 1, 0],
          ],
        },
      })

      // Cluster circles (color by dominant type)
      map.addLayer({
        id: 'all_points_clusters',
        type: 'circle',
        source: 'all_points',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'case',
            ['>', ['get', 'unofficial_count'], ['max', ['get', 'official_count'], ['get', 'border_count']]],
            '#B42222', // red
            ['>', ['get', 'official_count'], ['max', ['get', 'unofficial_count'], ['get', 'border_count']]],
            '#2ecc40', // green
            ['>', ['get', 'border_count'], ['max', ['get', 'unofficial_count'], ['get', 'official_count']]],
            '#0047AB', // blue
            '#888', // fallback gray
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 30],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })
      // Cluster count label
      map.addLayer({
        id: 'all_points_cluster_count',
        type: 'symbol',
        source: 'all_points',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: {
          'text-color': '#222',
        },
      })
      // Unclustered points (color by type)
      map.addLayer({
        id: 'all_points_unclustered',
        type: 'circle',
        source: 'all_points',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'point_type'],
            'unofficial',
            '#B42222',
            'official',
            '#2ecc40',
            'border',
            '#0047AB',
            '#888',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000',
        },
      })

      // Cluster click: zoom in or show popup with breakdown
      map.on('click', 'all_points_clusters', function (e) {
        const features = map.queryRenderedFeatures(e.point, { layers: ['all_points_clusters'] })
        if (!features.length) return
        const cluster = features[0]
        const coordinates = cluster.geometry.coordinates.slice()
        const props = cluster.properties

        // Zoom in on single click
        map.getSource('all_points').getClusterExpansionZoom(cluster.id, function (err, zoom) {
          if (err) return
          map.easeTo({
            center: coordinates,
            zoom: zoom,
            duration: 500,
          })
        })
      })
      // Change cursor on cluster hover
      map.on('mouseenter', 'all_points_clusters', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'all_points_clusters', () => {
        map.getCanvas().style.cursor = ''
      })

      loadCheckpointReports()
      loadBorderStations()
      loadOfficialCheckpoints()

      // Add a visible legend
      const legend = document.createElement('div')
      legend.className = 'map-legend'
      legend.style.position = 'absolute'
      legend.style.bottom = '120px'
      legend.style.left = '30px'
      legend.style.background = 'white'
      legend.style.padding = '12px 18px'
      legend.style.borderRadius = '8px'
      legend.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
      legend.style.fontSize = '14px'
      legend.style.zIndex = 1200
      legend.innerHTML = `
        <div style="font-weight:600;margin-bottom:8px;">Map Legend</div>
        <div style="display:flex;align-items:center;margin-bottom:6px;">
          <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#B42222;border:2px solid #fff;margin-right:8px;"></span>
          <span>User Reported Checkpoint</span>
        </div>
        <div style="display:flex;align-items:center;margin-bottom:6px;">
          <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#2ecc40;border:2px solid #fff;margin-right:8px;"></span>
          <span>Official Checkpoint</span>
        </div>
        <div style="display:flex;align-items:center;">
          <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#0047AB;border:2px solid #fff;margin-right:8px;"></span>
          <span>Border Patrol Station</span>
        </div>
      `
      map.getContainer().appendChild(legend)

      // Set initial visibility
      map.setLayoutProperty('placesLayer', 'visibility', visibleLayers.userReports ? 'visible' : 'none')
      map.setLayoutProperty('borderStationsLayer', 'visibility', visibleLayers.borderStations ? 'visible' : 'none')
      map.setLayoutProperty('officialCheckpointsLayer', 'visibility', visibleLayers.official ? 'visible' : 'none')
    })

    let popup = null

    map.on('mouseenter', 'all_points_unclustered', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const { coordinates } = e.features[0].geometry
      const props = e.features[0].properties
      const pointType = props.point_type

      let popupContent = ''

      if (pointType === 'unofficial') {
        popupContent = `
          <div class="popup-content">
            <h4 class="popup-title user-report">User Reported Checkpoint</h4>
            <div class="popup-field"><strong>Type:</strong> ${props.checkpoint_type}</div>
            <div class="popup-field"><strong>Agency:</strong> ${props.agency}</div>
            <div class="popup-field"><strong>Date:</strong> ${props.date_observed}</div>
            ${props.details ? `<div class="popup-field"><strong>Details:</strong> ${props.details}</div>` : ''}
            ${props.using_technology ? `<div class="popup-field"><strong>Technology Used:</strong> Yes</div>` : ''}
          </div>
        `
      } else if (pointType === 'border') {
        popupContent = `
          <div class="popup-content">
            <h3 class="popup-title border-station">${props.checkpoint_name}</h3>
            <div class="popup-field"><strong>Location:</strong> ${props.city}, ${props.state}</div>
            ${props.description ? `<div class="popup-field"><strong>Description:</strong> ${props.description}</div>` : ''}
            <div class="popup-subtitle">Border Patrol Station</div>
          </div>
        `
      } else if (pointType === 'official') {
        popupContent = `
          <div class="popup-content">
            <h4 class="popup-title" style="color:#2ecc40;">Official Checkpoint</h4>
            <div class="popup-field"><strong>Location:</strong> ${props.location}</div>
            <div class="popup-field"><strong>Date:</strong> ${props.date}</div>
            <div class="popup-field"><strong>Verification:</strong> ${props.verification}</div>
            ${props.description ? `<div class="popup-field"><strong>Description:</strong> ${props.description}</div>` : ''}
            <div class="popup-field"><strong>Agency:</strong> ${props.agency}</div>
            ${props.using_technology ? `<div class="popup-field"><strong>Technology Used:</strong> Yes</div>` : ''}
          </div>
        `
      }

      popup = new maplibregl.Popup().setLngLat(coordinates).setHTML(popupContent).addTo(map)
    })

    map.on('mouseleave', 'all_points_unclustered', () => {
      map.getCanvas().style.cursor = ''
      popup?.remove()
    })

    map.on('mouseenter', 'placesLayer', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const { coordinates } = e.features[0].geometry
      const { checkpoint_type, agency, date_observed, details, using_technology } = e.features[0].properties

      popup = new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="popup-content">
            <h4 class="popup-title user-report">User Reported Checkpoint</h4>
            <div class="popup-field"><strong>Type:</strong> ${checkpoint_type}</div>
            <div class="popup-field"><strong>Agency:</strong> ${agency}</div>
            <div class="popup-field"><strong>Date:</strong> ${date_observed}</div>
            ${details ? `<div class="popup-field"><strong>Details:</strong> ${details}</div>` : ''}
            ${using_technology ? `<div class="popup-field"><strong>Technology Used:</strong> Yes</div>` : ''}
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseleave', 'placesLayer', () => {
      map.getCanvas().style.cursor = ''
      popup?.remove()
    })

    map.on('mouseenter', 'borderStationsLayer', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const { coordinates } = e.features[0].geometry
      const { checkpoint_name, city, state, description } = e.features[0].properties

      popup = new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="popup-content">
            <h3 class="popup-title border-station">${checkpoint_name}</h3>
            <div class="popup-field"><strong>Location:</strong> ${city}, ${state}</div>
            ${description ? `<div class="popup-field"><strong>Description:</strong> ${description}</div>` : ''}
            <div class="popup-subtitle">Border Patrol Station</div>
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseleave', 'borderStationsLayer', () => {
      map.getCanvas().style.cursor = ''
      popup?.remove()
    })

    map.on('mouseenter', 'officialCheckpointsLayer', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const { coordinates } = e.features[0].geometry
      const { location, date, verification, description, agency, using_technology } = e.features[0].properties
      popup = new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="popup-content">
            <h4 class="popup-title" style="color:#2ecc40;">Official Checkpoint</h4>
            <div class="popup-field"><strong>Location:</strong> ${location}</div>
            <div class="popup-field"><strong>Date:</strong> ${date}</div>
            <div class="popup-field"><strong>Verification:</strong> ${verification}</div>
            ${description ? `<div class="popup-field"><strong>Description:</strong> ${description}</div>` : ''}
            <div class="popup-field"><strong>Agency:</strong> ${agency}</div>
            ${using_technology ? `<div class="popup-field"><strong>Technology Used:</strong> Yes</div>` : ''}
          </div>
        `)
        .addTo(map)
    })
    map.on('mouseleave', 'officialCheckpointsLayer', () => {
      map.getCanvas().style.cursor = ''
      popup?.remove()
    })

    // Handle clicks on the map or existing points
    map.on('click', (e) => {
      // Close any popups
      popup?.remove()

      // Check if clicking on a cluster first
      const clusterFeatures = map.queryRenderedFeatures(e.point, {
        layers: ['all_points_clusters'],
      })

      if (clusterFeatures.length > 0) {
        // Clicked on a cluster, don't show report form (cluster handler will take care of zooming)
        return
      }

      // Check if clicking on a clustered point (unclustered individual points)
      const pointFeatures = map.queryRenderedFeatures(e.point, {
        layers: ['all_points_unclustered'],
      })

      if (pointFeatures.length > 0) {
        const feature = pointFeatures[0]
        const pointType = feature.properties.point_type

        if (pointType === 'border') {
          // Clicked on a border station
          setSelectedCheckpoint({
            type: 'border_station',
            name: feature.properties.checkpoint_name,
            city: feature.properties.city,
            state: feature.properties.state,
            description: feature.properties.description,
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
          })
        } else if (pointType === 'unofficial') {
          // Clicked on a user report
          setSelectedCheckpoint({
            type: 'user_report',
            checkpoint_type: feature.properties.checkpoint_type,
            agency: feature.properties.agency,
            date_observed: feature.properties.date_observed,
            details: feature.properties.details,
            using_technology: feature.properties.using_technology,
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            created_at: feature.properties.created_at,
          })
        } else if (pointType === 'official') {
          // Clicked on an official checkpoint
          setSelectedCheckpoint({
            type: 'official',
            location: feature.properties.location,
            date: feature.properties.date,
            verification: feature.properties.verification,
            description: feature.properties.description,
            agency: feature.properties.agency,
            using_technology: feature.properties.using_technology,
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
          })
        }

        setShowCheckpointInfo(true)
        setShowForm(false)

        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove()
          tempMarkerRef.current = null
        }
        return
      }

      // Clicked on map (not on an existing point or cluster)
      setShowCheckpointInfo(false)

      // Remove existing temporary marker
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove()
      }

      // Create new temporary marker
      tempMarkerRef.current = new maplibregl.Marker({
        color: '#ff6b6b',
        scale: 0.8,
      })
        .setLngLat(e.lngLat)
        .addTo(map)

      // Set form data and show form
      setFormData({
        checkpoint_type: '',
        agency: '',
        date_observed: '',
        details: '',
        using_technology: false,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      })
      setShowForm(true)
    })

    return () => {
      map.remove()
    }
  }, [])

  // Helper for slider step (days)
  function getDateStep(min, max) {
    if (!min || !max) return 1
    const diff = (new Date(max) - new Date(min)) / (1000 * 60 * 60 * 24)
    return diff < 1 ? 1 : 1
  }
  // Helper for slider marks
  function formatDate(date) {
    if (!date) return ''
    return date
  }

  // Update map layer visibility when visibleLayers changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Filter all_points based on visible layers
    let filteredUserReports = originalUserReportsRef.current
    let filteredOfficial = originalOfficialCheckpointsRef.current
    let filteredBorder = legalCheckpointsRef.current.features

    // Apply date filtering
    if (unofficialDateRange[0] && unofficialDateRange[1]) {
      filteredUserReports = filteredUserReports.filter((f) => {
        const d = f.properties.date_observed
        if (!d) return false
        return d >= unofficialDateRange[0] && d <= unofficialDateRange[1]
      })
    }
    if (officialDateRange[0] && officialDateRange[1]) {
      filteredOfficial = filteredOfficial.filter((f) => {
        const d = f.properties.date
        if (!d) return false
        return d >= officialDateRange[0] && d <= officialDateRange[1]
      })
    }

    // Apply layer visibility filtering
    const allFeatures = [
      ...(visibleLayers.userReports
        ? filteredUserReports.map((f) => ({ ...f, properties: { ...f.properties, point_type: 'unofficial' } }))
        : []),
      ...(visibleLayers.borderStations
        ? filteredBorder.map((f) => ({ ...f, properties: { ...f.properties, point_type: 'border' } }))
        : []),
      ...(visibleLayers.official
        ? filteredOfficial.map((f) => ({ ...f, properties: { ...f.properties, point_type: 'official' } }))
        : []),
    ]

    allPointsRef.current.features = allFeatures
    if (map.getSource('all_points')) {
      map.getSource('all_points').setData(allPointsRef.current)
    }

    // Keep the old individual layers hidden
    if (map.getLayer('placesLayer')) {
      map.setLayoutProperty('placesLayer', 'visibility', 'none')
    }
    if (map.getLayer('borderStationsLayer')) {
      map.setLayoutProperty('borderStationsLayer', 'visibility', 'none')
    }
    if (map.getLayer('officialCheckpointsLayer')) {
      map.setLayoutProperty('officialCheckpointsLayer', 'visibility', 'none')
    }
  }, [visibleLayers, unofficialDateRange, officialDateRange])

  const handleLayerToggle = (layer) => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  // Search functionality
  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=us`
      )
      const data = await response.json()

      const results = data.map((item) => ({
        name: item.display_name.split(',')[0],
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }))

      setSearchResults(results)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)

    // Debounce search requests
    clearTimeout(window.searchTimeout)
    window.searchTimeout = setTimeout(() => {
      searchLocation(query)
    }, 300)
  }

  const handleSearchResultClick = (result) => {
    const map = mapRef.current
    if (map) {
      // Fly to the selected location
      map.flyTo({
        center: [result.lng, result.lat],
        zoom: 14,
        duration: 2000,
      })
      // Remove previous search marker if exists
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove()
      }
      // Add a new marker for the searched address
      searchMarkerRef.current = new maplibregl.Marker({
        color: '#a259f7', // purple
        scale: 0.8,
      })
        .setLngLat([result.lng, result.lat])
        .addTo(map)
    }
    setSearchQuery(result.name)
    setShowSearchResults(false)
  }

  const handleSearchBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => {
      setShowSearchResults(false)
    }, 200)
  }

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (checkpointType === 'official') {
        const { data, error } = await supabase
          .from('official_checkpoints')
          .insert([
            {
              location: formData.location,
              date: formData.date,
              verification: formData.verification,
              description: formData.description,
              agency: formData.agency,
              using_technology: formData.using_technology,
              latitude: formData.lat,
              longitude: formData.lng,
            },
          ])
          .select()
        if (error) throw error
        alert('Official checkpoint submitted!')
        setShowForm(false)
      } else {
        const { data, error } = await supabase
          .from('checkpoint_reports')
          .insert([
            {
              checkpoint_type: formData.checkpoint_type,
              agency: formData.agency,
              date_observed: formData.date_observed,
              details: formData.details,
              using_technology: formData.using_technology,
              lat: formData.lat,
              lng: formData.lng,
            },
          ])
          .select()
        if (error) throw error
        alert('Unofficial checkpoint submitted!')
        setShowForm(false)
      }
    } catch (err) {
      console.error('Error submitting:', err)
      alert('Error submitting report. Please try again.')
    }
  }

  const handleCloseForm = () => {
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove()
      tempMarkerRef.current = null
    }
    setShowForm(false)
  }

  const handleCloseInfo = () => {
    setShowCheckpointInfo(false)
    setSelectedCheckpoint(null)
  }

  return (
    <div className="report-container">
      <div className="filter-sidebar">
        <div className="filter-title">Show on Map</div>
        <div className="filter-checkbox-group">
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={visibleLayers.userReports}
              onChange={() => handleLayerToggle('userReports')}
            />
            User Reported Checkpoints
          </label>
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={visibleLayers.official}
              onChange={() => handleLayerToggle('official')}
            />
            Official Checkpoints
          </label>
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={visibleLayers.borderStations}
              onChange={() => handleLayerToggle('borderStations')}
            />
            Border Patrol Stations
          </label>
        </div>
        {/* Unofficial Date Slider */}
        <div className="form-group" style={{ marginTop: '18px' }}>
          <label className="form-label">Unofficial Date Range</label>
          {unofficialDateLimits[0] &&
          unofficialDateLimits[1] &&
          unofficialDateLimits[0] !== unofficialDateLimits[1] ? (
            <>
              <input
                type="date"
                className="form-input"
                min={unofficialDateLimits[0]}
                max={unofficialDateLimits[1]}
                value={unofficialDateRange[0]}
                onChange={(e) => setUnofficialDateRange([e.target.value, unofficialDateRange[1]])}
                style={{ marginBottom: 6 }}
              />
              <input
                type="date"
                className="form-input"
                min={unofficialDateLimits[0]}
                max={unofficialDateLimits[1]}
                value={unofficialDateRange[1]}
                onChange={(e) => setUnofficialDateRange([unofficialDateRange[0], e.target.value])}
              />
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {formatDate(unofficialDateRange[0])} to {formatDate(unofficialDateRange[1])}
              </div>
            </>
          ) : unofficialDateLimits[0] && unofficialDateLimits[1] ? (
            <input type="date" className="form-input" value={unofficialDateLimits[0]} disabled />
          ) : (
            <div style={{ fontSize: 12, color: '#888' }}>No unofficial checkpoint dates</div>
          )}
        </div>
        {/* Official Date Slider */}
        <div className="form-group">
          <label className="form-label">Official Date Range</label>
          {officialDateLimits[0] &&
          officialDateLimits[1] &&
          officialDateLimits[0] !== officialDateLimits[1] ? (
            <>
              <input
                type="date"
                className="form-input"
                min={officialDateLimits[0]}
                max={officialDateLimits[1]}
                value={officialDateRange[0]}
                onChange={(e) => setOfficialDateRange([e.target.value, officialDateRange[1]])}
                style={{ marginBottom: 6 }}
              />
              <input
                type="date"
                className="form-input"
                min={officialDateLimits[0]}
                max={officialDateLimits[1]}
                value={officialDateRange[1]}
                onChange={(e) => setOfficialDateRange([officialDateRange[0], e.target.value])}
              />
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {formatDate(officialDateRange[0])} to {formatDate(officialDateRange[1])}
              </div>
            </>
          ) : officialDateLimits[0] && officialDateLimits[1] ? (
            <input type="date" className="form-input" value={officialDateLimits[0]} disabled />
          ) : (
            <div style={{ fontSize: 12, color: '#888' }}>No official checkpoint dates</div>
          )}
        </div>
      </div>
      <div className="map-container" ref={mapContainerRef}>
        <div className="search-container">
          <input
            type="text"
            className="search-box"
            placeholder="Search for an address or location..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            onBlur={handleSearchBlur}
          />
          {showSearchResults && (
            <div className="search-results">
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <div className="search-result-name">{result.name}</div>
                    <div className="search-result-address">{result.address}</div>
                  </div>
                ))
              ) : (
                <div className="search-no-results">No results found</div>
              )}
            </div>
          )}
        </div>
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

        {!showForm && !showCheckpointInfo && (
          <div className="click-instruction">
            <span className="click-instruction-icon">🗺️</span>Click anywhere on the map to report a checkpoint, or click on a dot to view more information.
          </div>
        )}
      </div>

      <div className={`form-sidebar ${showForm ? 'visible' : ''}`}>
        <button className="close-button" onClick={handleCloseForm}>×</button>
        <h2 className="form-title">Report an {checkpointType === 'official' ? 'Official' : 'Unofficial'} Checkpoint</h2>
        <div className="coordinates-display">
          <strong>Location:</strong>
          Lat: {formData.lat?.toFixed(6)}<br />
          Lng: {formData.lng?.toFixed(6)}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Type of Report *</label>
            <select
              className="form-select"
              value={checkpointType}
              onChange={(e) => setCheckpointType(e.target.value)}
              required
            >
              <option value="unofficial">Unofficial</option>
              <option value="official">Official</option>
            </select>
          </div>
          {checkpointType === 'unofficial' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type of Checkpoint *</label>
                  <select
                    className="form-select"
                    value={formData.checkpoint_type}
                    onChange={(e) => handleFormChange('checkpoint_type', e.target.value)}
                    required
                  >
                    <option value="">Select type...</option>
                    <option value="DUI/Sobriety">DUI/Sobriety</option>
                    <option value="Immigration">Immigration</option>
                    <option value="Drug Enforcement">Drug Enforcement</option>
                    <option value="Traffic Safety">Traffic Safety</option>
                    <option value="License/Registration">License/Registration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Agency or Type *</label>
                  <select
                    className="form-select"
                    value={formData.agency}
                    onChange={(e) => handleFormChange('agency', e.target.value)}
                    required
                  >
                    <option value="">Select agency...</option>
                    <option value="Local Police">Local Police</option>
                    <option value="State Police">State Police</option>
                    <option value="Sheriff's Department">Sheriff's Department</option>
                    <option value="Border Patrol">Border Patrol</option>
                    <option value="DEA">DEA</option>
                    <option value="Other Federal">Other Federal</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date Observed *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date_observed}
                  onChange={(e) => handleFormChange('date_observed', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Details</label>
                <textarea
                  className="form-textarea"
                  placeholder="Stopping every car, questions asked, documents requested, etc."
                  value={formData.details}
                  onChange={(e) => handleFormChange('details', e.target.value)}
                />
              </div>
              <div className="form-checkbox-group">
                <input
                  type="checkbox"
                  id="using_technology"
                  className="form-checkbox"
                  checked={formData.using_technology}
                  onChange={(e) => handleFormChange('using_technology', e.target.checked)}
                />
                <label htmlFor="using_technology" className="form-checkbox-label">
                  Using technology (drones, license plate readers, scanners)
                </label>
              </div>
            </>
          )}
          {checkpointType === 'official' && (
            <>
              <div className="form-group">
                <label className="form-label">Location (Address) *</label>
                <input
                  className="form-input"
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  required={checkpointType === 'official'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  required={checkpointType === 'official'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Verification *</label>
                <select
                  className="form-select"
                  value={formData.verification}
                  onChange={(e) => handleFormChange('verification', e.target.value)}
                  required={checkpointType === 'official'}
                >
                  <option value="">Select verification...</option>
                  <option value="POGO">POGO</option>
                  <option value="News">News</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Agency *</label>
                <select
                  className="form-select"
                  value={formData.agency}
                  onChange={(e) => handleFormChange('agency', e.target.value)}
                  required
                >
                  <option value="">Select agency...</option>
                  <option value="Local Police">Local Police</option>
                  <option value="State Police">State Police</option>
                  <option value="Sheriff's Department">Sheriff's Department</option>
                  <option value="Border Patrol">Border Patrol</option>
                  <option value="DEA">DEA</option>
                  <option value="Other Federal">Other Federal</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div className="form-checkbox-group">
                <input
                  type="checkbox"
                  id="using_technology"
                  className="form-checkbox"
                  checked={formData.using_technology}
                  onChange={(e) => handleFormChange('using_technology', e.target.checked)}
                />
                <label htmlFor="using_technology" className="form-checkbox-label">
                  Using technology (drones, license plate readers, scanners)
                </label>
              </div>
            </>
          )}
          <button
            type="submit"
            className="btn-submit"
            disabled={
              (checkpointType === 'unofficial' &&
                (!formData.checkpoint_type || !formData.agency || !formData.date_observed)) ||
              (checkpointType === 'official' &&
                (!formData.location || !formData.date || !formData.verification || !formData.agency))
            }
          >
            Submit Report
          </button>
        </form>
      </div>

      <div className={`info-sidebar ${showCheckpointInfo ? 'visible' : ''}`}>
        <button className="close-button" onClick={handleCloseInfo}>×</button>

        {selectedCheckpoint?.type === 'border_station' && (
          <>
            <h2 className="info-title border-station">{selectedCheckpoint.name}</h2>

            <div className="coordinates-display">
              <strong>Location:</strong>
              Lat: {selectedCheckpoint.lat.toFixed(6)}<br />
              Lng: {selectedCheckpoint.lng.toFixed(6)}
            </div>

            <div className="info-field">
              <div className="info-field-label">City/State:</div>
              <div className="info-field-value">
                {selectedCheckpoint.city}, {selectedCheckpoint.state}
              </div>
            </div>

            {selectedCheckpoint.description && (
              <div className="info-field">
                <div className="info-field-label">Description:</div>
                <div className="info-field-value">{selectedCheckpoint.description}</div>
              </div>
            )}

            <div className="info-field">
              <div
                className="info-field-value"
                style={{ color: '#0047AB', fontStyle: 'italic', marginTop: '10px' }}
              >
                Border Patrol Station
              </div>
            </div>
          </>
        )}

        {selectedCheckpoint?.type === 'user_report' && (
          <>
            <h2 className="info-title user-report">User Reported Checkpoint</h2>

            <div className="coordinates-display">
              <strong>Location:</strong>
              Lat: {selectedCheckpoint.lat.toFixed(6)}<br />
              Lng: {selectedCheckpoint.lng.toFixed(6)}
            </div>

            <div className="info-field">
              <div className="info-field-label">Type:</div>
              <div className="info-field-value">{selectedCheckpoint.checkpoint_type}</div>
            </div>

            <div className="info-field">
              <div className="info-field-label">Agency:</div>
              <div className="info-field-value">{selectedCheckpoint.agency}</div>
            </div>

            <div className="info-field">
              <div className="info-field-label">Date Observed:</div>
              <div className="info-field-value">{selectedCheckpoint.date_observed}</div>
            </div>

            {selectedCheckpoint.details && (
              <div className="info-field">
                <div className="info-field-label">Details:</div>
                <div className="info-field-value">{selectedCheckpoint.details}</div>
              </div>
            )}

            {selectedCheckpoint.using_technology && (
              <div className="info-field">
                <div className="info-field-label">Technology Used:</div>
                <div className="info-field-value">Yes</div>
              </div>
            )}
          </>
        )}

        {selectedCheckpoint?.type === 'official' && (
          <>
            <h2 className="info-title" style={{ color: '#2ecc40' }}>Official Checkpoint</h2>
            <div className="coordinates-display">
              <strong>Location:</strong>
              Lat: {selectedCheckpoint.lat.toFixed(6)}<br />
              Lng: {selectedCheckpoint.lng.toFixed(6)}
            </div>
            <div className="info-field">
              <div className="info-field-label">Address:</div>
              <div className="info-field-value">{selectedCheckpoint.location}</div>
            </div>
            <div className="info-field">
              <div className="info-field-label">Date:</div>
              <div className="info-field-value">{selectedCheckpoint.date}</div>
            </div>
            <div className="info-field">
              <div className="info-field-label">Verification:</div>
              <div className="info-field-value">{selectedCheckpoint.verification}</div>
            </div>
            {selectedCheckpoint.description && (
              <div className="info-field">
                <div className="info-field-label">Description:</div>
                <div className="info-field-value">{selectedCheckpoint.description}</div>
              </div>
            )}
            <div className="info-field">
              <div className="info-field-label">Agency:</div>
              <div className="info-field-value">{selectedCheckpoint.agency}</div>
            </div>
            {selectedCheckpoint.using_technology && (
              <div className="info-field">
                <div className="info-field-label">Technology Used:</div>
                <div className="info-field-value">Yes</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ReportMap
