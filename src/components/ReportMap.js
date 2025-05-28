// ReportMap.js
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { createClient } from '@supabase/supabase-js'
import 'maplibre-gl/dist/maplibre-gl.css'

// Supabase setup
const supabaseUrl = 'https://yybdwyflzpzgdqanrbpa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YmR3eWZsenB6Z2RxYW5yYnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg0NDYsImV4cCI6MjA2MjQxNDQ0Nn0.P5frBEg6mUQqfYIcGtKDYUSpG-po6wla7zsz3PTgYgw'
const supabase = createClient(supabaseUrl, supabaseKey)

const ReportMap = () => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const tempMarkerRef = useRef(null)
  const geojsonRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })
  const legalCheckpointsRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })

  const [showForm, setShowForm] = useState(false)
  const [showCheckpointInfo, setShowCheckpointInfo] = useState(false)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [formData, setFormData] = useState({
    checkpoint_type: '',
    agency: '',
    date_observed: '',
    details: '',
    using_technology: false,
    lat: null,
    lng: null
  })

  useEffect(() => {
    // custom styles for map and sidebar
    const style = document.createElement('style')
    style.textContent = `
      .report-container {
        display: flex;
        height: 100%;
        width: 100%;
      }
      
      .map-container {
        width: 100%;
        height: 100%;
        position: relative;
      }
      
      .form-sidebar {
        width: 320px;
        background: white;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        padding: 20px;
        position: fixed;
        top: 50%;
        right: -320px;
        transform: translateY(-50%);
        transition: right 0.3s ease;
        max-height: 85vh;
        overflow-y: auto;
        z-index: 1000;
        border-radius: 8px 0 0 8px;
      }
      
      .form-sidebar.visible {
        right: 0;
      }
      
      .info-sidebar {
        width: 300px;
        background: white;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        padding: 20px;
        position: fixed;
        top: 50%;
        right: -300px;
        transform: translateY(-50%);
        transition: right 0.3s ease;
        height: auto;
        max-height: 85vh;
        overflow-y: auto;
        z-index: 1000;
        border-radius: 8px 0 0 8px;
      }
      
      .info-sidebar.visible {
        right: 0;
      }
      
      .info-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
      }
      
      .info-title.user-report {
        color: #B42222;
      }
      
      .info-title.border-station {
        color: #0047AB;
      }
      
      .info-field {
        margin-bottom: 12px;
      }
      
      .info-field-label {
        font-weight: 500;
        font-size: 13px;
        color: #555;
        margin-bottom: 4px;
      }
      
      .info-field-value {
        font-size: 14px;
        color: #333;
      }
      
      .form-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #333;
        padding-right: 30px;
      }
      
      .close-button {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 26px;
        height: 26px;
        background: #f8f9fa;
        border: 2px solid #e0e0e0;
        border-radius: 50%;
        color: #666;
        font-size: 17px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .close-button:hover {
        background: #e9ecef;
        border-color: #ccc;
        color: #333;
      }
      
      .coordinates-display {
        background: #f8f9fa;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        font-size: 13px;
        color: #555;
        text-align: center;
      }
      
      .coordinates-display strong {
        color: #333;
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
      }
      
      .form-group {
        margin-bottom: 14px;
      }
      
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 14px;
      }
      
      .form-label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 500;
        color: #555;
      }
      
      .form-input, .form-select, .form-textarea {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        background: #f8f9fa;
        color: #333;
        font-size: 13px;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }
      
      .form-input::placeholder, .form-textarea::placeholder {
        color: #999;
      }
      
      .form-input:focus, .form-select:focus, .form-textarea:focus {
        outline: none;
        border-color: #667eea;
        background: white;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      .form-textarea {
        min-height: 70px;
        resize: vertical;
      }
      
      .form-checkbox-group {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 14px;
      }
      
      .form-checkbox {
        transform: scale(1.2);
        margin-top: 2px;
        flex-shrink: 0;
      }
      
      .form-checkbox-label {
        font-size: 12px;
        color: #555;
        line-height: 1.3;
      }
      
      .btn-submit {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #667eea 0%, #65b6f7 100%);
        border: none;
        border-radius: 6px;
        color: white;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 12px;
      }
      
      .btn-submit:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5);
      }
      
      .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      /* Popup Styling */
      .maplibregl-popup-content {
        padding: 0 !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        max-width: 250px !important;
      }
      
      .maplibregl-popup-close-button {
        color: #666 !important;
        font-size: 18px !important;
        padding: 2px 6px !important;
      }
      
      .popup-content {
        padding: 12px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      
      .popup-title {
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: #333;
      }
      
      .popup-title.user-report {
        color: #B42222;
      }
      
      .popup-title.border-station {
        color: #0047AB;
      }
      
      .popup-field {
        margin: 4px 0;
        font-size: 12px;
        line-height: 1.3;
      }
      
      .popup-field strong {
        color: #555;
      }
      
      .popup-subtitle {
        font-style: italic;
        font-size: 11px;
        color: #777;
        margin-top: 8px;
      }
      
      .click-instruction {
        position: absolute;
        bottom: 80px;
        right: 20px;
        background: rgba(102, 126, 234, 0.95);
        backdrop-filter: blur(10px);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        font-size: 14px;
        font-weight: 500;
        z-index: 500;
        max-width: 200px;
        pointer-events: none;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      
      .click-instruction-icon {
        font-size: 16px;
        margin-right: 6px;
      }
      
      .search-container {
        position: absolute;
        top: 100px;
        left: 20px;
        z-index: 1000;
        width: 300px;
      }
      
      .search-box {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        background: white;
        color: #333;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        box-sizing: border-box;
      }
      
      .search-box:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      .search-box::placeholder {
        color: #999;
      }
      
      .search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 2px solid #e0e0e0;
        border-top: none;
        border-radius: 0 0 8px 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1001;
      }
      
      .search-result-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: background-color 0.2s ease;
      }
      
      .search-result-item:hover {
        background-color: #f8f9fa;
      }
      
      .search-result-item:last-child {
        border-bottom: none;
      }
      
      .search-result-name {
        font-weight: 500;
        color: #333;
        font-size: 14px;
        margin-bottom: 2px;
      }
      
      .search-result-address {
        color: #666;
        font-size: 12px;
      }
      
      .search-loading {
        padding: 12px 16px;
        text-align: center;
        color: #666;
        font-size: 13px;
      }
      
      .search-no-results {
        padding: 12px 16px;
        text-align: center;
        color: #999;
        font-size: 13px;
      }
    `
    document.head.appendChild(style)

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:
        'https://api.maptiler.com/maps/0196cd3f-fb75-77c7-b9fc-336a56159c73/style.json?key=6Yi2lIi7fKDCpeBAXoYW',
      center: [-98.5795, 39.8283],
      zoom: 4,
    })

    mapRef.current = map

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
          created_at: record.created_at
        },
        geometry: {
          type: 'Point',
          coordinates: [record.lng, record.lat],
        },
      }))

      geojsonRef.current.features.push(...features)
      map.getSource('places')?.setData(geojsonRef.current)
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
          type: 'border_station'
        },
        geometry: {
          type: 'Point',
          coordinates: [record.long, record.lat],
        },
      }))

      legalCheckpointsRef.current.features = features
      map.getSource('border_stations')?.setData(legalCheckpointsRef.current)
    }

    map.on('load', () => {
      map.resize()

      map.addSource('places', {
        type: 'geojson',
        data: geojsonRef.current,
      })

      map.addLayer({
        id: 'placesLayer',
        type: 'circle',
        source: 'places',
        paint: {
          'circle-radius': 6,
          'circle-color': '#B42222',
        },
      })

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
          'circle-color': '#0047AB',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      loadCheckpointReports()
      loadBorderStations()

      const legend = document.createElement('div')
      legend.className = 'map-legend'
      legend.innerHTML = `
        <div class="legend-title">Map Legend</div>
        <div class="legend-item">
          <span class="legend-marker legal-marker"></span>
          <span>Border Patrol Station</span>
        </div>
        <div class="legend-item">
          <span class="legend-marker contribution-marker"></span>
          <span>User Reported Checkpoint</span>
        </div>
      `
      map.getContainer().appendChild(legend)
    })

    let popup = null

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

    // Handle clicks on the map or existing points
    map.on('click', (e) => {
      // Close any popups
      popup?.remove()

      // Check if clicking on a border station
      const borderStationFeatures = map.queryRenderedFeatures(e.point, {
        layers: ['borderStationsLayer']
      })

      if (borderStationFeatures.length > 0) {
        // Clicked on a border station
        const feature = borderStationFeatures[0]
        setSelectedCheckpoint({
          type: 'border_station',
          name: feature.properties.checkpoint_name,
          city: feature.properties.city,
          state: feature.properties.state,
          description: feature.properties.description,
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0]
        })
        setShowCheckpointInfo(true)
        setShowForm(false)
        
        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove()
          tempMarkerRef.current = null
        }
        return
      }

      // Check if clicking on a user report
      const reportFeatures = map.queryRenderedFeatures(e.point, {
        layers: ['placesLayer']
      })

      if (reportFeatures.length > 0) {
        // Clicked on a user report
        const feature = reportFeatures[0]
        setSelectedCheckpoint({
          type: 'user_report',
          checkpoint_type: feature.properties.checkpoint_type,
          agency: feature.properties.agency,
          date_observed: feature.properties.date_observed,
          details: feature.properties.details,
          using_technology: feature.properties.using_technology,
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0],
          created_at: feature.properties.created_at
        })
        setShowCheckpointInfo(true)
        setShowForm(false)
        
        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove()
          tempMarkerRef.current = null
        }
        return
      }

      // Clicked on map (not on an existing point)
      setShowCheckpointInfo(false)
      
      // Remove existing temporary marker
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove()
      }

      // Create new temporary marker
      tempMarkerRef.current = new maplibregl.Marker({ 
        color: '#ff6b6b',
        scale: 1.2
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
        lng: e.lngLat.lng
      })
      setShowForm(true)
    })

    return () => {
      map.remove()
    }
  }, [])

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
      
      const results = data.map(item => ({
        name: item.display_name.split(',')[0],
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
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
        duration: 2000
      })
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.checkpoint_type || !formData.agency || !formData.date_observed) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { data, error } = await supabase
        .from('checkpoint_reports')
        .insert([{ 
          checkpoint_type: formData.checkpoint_type, 
          agency: formData.agency, 
          date_observed: formData.date_observed, 
          details: formData.details, 
          using_technology: formData.using_technology,
          lat: formData.lat, 
          lng: formData.lng 
        }])
        .select()

      if (error) throw error

      const newFeature = {
        type: 'Feature',
        properties: {
          checkpoint_type: formData.checkpoint_type,
          agency: formData.agency,
          date_observed: formData.date_observed,
          details: formData.details,
          using_technology: formData.using_technology,
          type: 'user_report'
        },
        geometry: {
          type: 'Point',
          coordinates: [formData.lng, formData.lat],
        },
      }

      geojsonRef.current.features.push(newFeature)
      const map = mapRef.current
      map?.getSource('places')?.setData(geojsonRef.current)

      // Remove temporary marker and close form
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove()
        tempMarkerRef.current = null
      }
      setShowForm(false)
      
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
      <div className="map-container">
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        
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
        
        {!showForm && !showCheckpointInfo && (
          <div className="click-instruction">
            <span className="click-instruction-icon">🗺️</span>Click anywhere on the map to report a checkpoint, or click on a dot to view more information.
          </div>
        )}
      </div>
      
      <div className={`form-sidebar ${showForm ? 'visible' : ''}`}>
        <button className="close-button" onClick={handleCloseForm}>×</button>
        
        <h2 className="form-title">Report a Checkpoint</h2>
        
        <div className="coordinates-display">
          <strong>Location:</strong>
          Lat: {formData.lat?.toFixed(6)}<br />
          Lng: {formData.lng?.toFixed(6)}
        </div>

        <form onSubmit={handleSubmit}>
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

          <button 
            type="submit" 
            className="btn-submit"
            disabled={!formData.checkpoint_type || !formData.agency || !formData.date_observed}
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
              <div className="info-field-value">{selectedCheckpoint.city}, {selectedCheckpoint.state}</div>
            </div>
            
            {selectedCheckpoint.description && (
              <div className="info-field">
                <div className="info-field-label">Description:</div>
                <div className="info-field-value">{selectedCheckpoint.description}</div>
              </div>
            )}
            
            <div className="info-field">
              <div className="info-field-value" style={{ color: '#0047AB', fontStyle: 'italic', marginTop: '10px' }}>
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
      </div>
    </div>
  )
}

export default ReportMap
