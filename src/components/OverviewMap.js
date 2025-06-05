// OverviewMap.js
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { createClient } from '@supabase/supabase-js'
import 'maplibre-gl/dist/maplibre-gl.css'
import './OverviewMap.css'

// Supabase setup
const supabaseUrl = 'https://yybdwyflzpzgdqanrbpa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YmR3eWZsenB6Z2RxYW5yYnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg0NDYsImV4cCI6MjA2MjQxNDQ0Nn0.P5frBEg6mUQqfYIcGtKDYUSpG-po6wla7zsz3PTgYgw'
const supabase = createClient(supabaseUrl, supabaseKey)

const OverviewMap = () => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

  // -------------------------------------------------------------------
  // 1. Add state to track which layers are visible
  // -------------------------------------------------------------------
  const [visibleLayers, setVisibleLayers] = useState({
    userReports: true,
    official: true,
    borderStations: true,
  })

  // Other state for when clicking a state, etc.
  const [selectedState, setSelectedState] = useState(null)
  const [showStateInfo, setShowStateInfo] = useState(false)
  const [stateData, setStateData] = useState(null)
  const [stateCounts, setStateCounts] = useState({
    userReports: 0,
    borderStations: 0,
    officialCheckpoints: 0,
  })

  // Refs for checkpoint data
  const userReportsRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })
  const borderStationsRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })
  const officialCheckpointsRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#2d3748', // Dark gray background
            },
          },
        ],
      },
      center: [-98.5795, 36.8283],
      zoom: 3.5,
      minZoom: 3,
      maxZoom: 10,
    })

    mapRef.current = map

    // -------------------------------------------------------------------
    // 2. Load US States GeoJSON (same as before)
    // -------------------------------------------------------------------
    const loadUSStates = async () => {
      try {
        const usResponse = await fetch(
          'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
        )
        const usStatesData = await usResponse.json()

        map.addSource('us-states', {
          type: 'geojson',
          data: usStatesData,
        })

        map.addLayer({
          id: 'state-fills',
          type: 'fill',
          source: 'us-states',
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#4299e1',
              '#718096',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.8,
              0.4,
            ],
          },
        })

        map.addLayer({
          id: 'state-borders',
          type: 'line',
          source: 'us-states',
          paint: {
            'line-color': '#e2e8f0',
            'line-width': 1,
            'line-opacity': 0.8,
          },
        })

        // -------------------------------------------------------------------
        // 3. Add checkpoint layers ON TOP of states (same styling as before)
        // -------------------------------------------------------------------
        map.addLayer({
          id: 'user-reports-layer',
          type: 'circle',
          source: 'user-reports',
          paint: {
            'circle-radius': 6,
            'circle-color': '#dc2626',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        })

        map.addLayer({
          id: 'official-checkpoints-layer',
          type: 'circle',
          source: 'official-checkpoints',
          paint: {
            'circle-radius': 6,
            'circle-color': '#059669',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        })

        map.addLayer({
          id: 'border-stations-layer',
          type: 'circle',
          source: 'border-stations',
          paint: {
            'circle-radius': 6,
            'circle-color': '#2563eb',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        })

        // -------------------------------------------------------------------
        // 4. State hover & click handlers (unchanged)
        // -------------------------------------------------------------------
        let hoveredStateId = null
        map.on('mousemove', 'state-fills', (e) => {
          if (e.features.length > 0) {
            if (hoveredStateId !== null) {
              map.setFeatureState(
                { source: 'us-states', id: hoveredStateId },
                { hover: false }
              )
            }
            hoveredStateId = e.features[0].id
            map.setFeatureState(
              { source: 'us-states', id: hoveredStateId },
              { hover: true }
            )
            map.getCanvas().style.cursor = 'pointer'
          }
        })

        map.on('mouseleave', 'state-fills', () => {
          if (hoveredStateId !== null) {
            map.setFeatureState(
              { source: 'us-states', id: hoveredStateId },
              { hover: false }
            )
          }
          hoveredStateId = null
          map.getCanvas().style.cursor = ''
        })

        map.on('click', 'state-fills', async (e) => {
          if (!e.features.length) return
          const props = e.features[0].properties
          const stateName =
            props.NAME || props.name || props.STATE_NAME || props.STUSPS || props.STATE
          const stateFeature = e.features[0]

          if (!stateName) {
            console.error('Could not determine state name:', props)
            return
          }

          // Fit to bounds (same as before)
          const bounds = new maplibregl.LngLatBounds()
          if (stateFeature.geometry.type === 'Polygon') {
            stateFeature.geometry.coordinates[0].forEach((coord) => {
              bounds.extend(coord)
            })
          } else if (stateFeature.geometry.type === 'MultiPolygon') {
            stateFeature.geometry.coordinates.forEach((poly) =>
              poly[0].forEach((coord) => bounds.extend(coord))
            )
          }

          map.fitBounds(bounds, {
            padding: { top: 150, bottom: 150, left: 150, right: 500 },
            duration: 1000,
            maxZoom: 6,
          })

          await loadStateInfo(stateName, stateFeature)
        })
      } catch (error) {
        console.error('Error loading US states:', error)
      }
    }

    // -------------------------------------------------------------------
    // 5. Load checkpoint data (same as before, populating userReportsRef, etc.)
    // -------------------------------------------------------------------
    const loadCheckpointReports = async () => {
      try {
        const { data, error } = await supabase.from('checkpoint_reports').select('*')
        if (error) throw error

        const features = data.map((record) => ({
          type: 'Feature',
          properties: {
            checkpoint_type: record.checkpoint_type,
            agency: record.agency,
            date_observed: record.date_observed,
            details: record.details,
            using_technology: record.using_technology,
            type: 'user_report',
          },
          geometry: {
            type: 'Point',
            coordinates: [record.lng, record.lat],
          },
        }))

        userReportsRef.current.features = features
        if (map.getSource('user-reports')) {
          map.getSource('user-reports').setData(userReportsRef.current)
        }
      } catch (error) {
        console.error('Error loading checkpoint reports:', error)
      }
    }

    const loadBorderStations = async () => {
      try {
        const { data, error } = await supabase.from('border_stations').select('*')
        if (error) throw error

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

        borderStationsRef.current.features = features
        if (map.getSource('border-stations')) {
          map.getSource('border-stations').setData(borderStationsRef.current)
        }
      } catch (error) {
        console.error('Error loading border stations:', error)
      }
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

        officialCheckpointsRef.current.features = features
        if (map.getSource('official-checkpoints')) {
          map.getSource('official-checkpoints').setData(officialCheckpointsRef.current)
        }
      } catch (error) {
        console.error('Error loading official checkpoints:', error)
      }
    }

    const loadStateInfo = async (stateName, stateFeature) => {
      try {
        const { data, error } = await supabase
          .from('states')
          .select('*')
          .eq('state_name', stateName)
          .single()
        if (error) {
          console.error('Error loading state info:', error)
          return
        }

        // Same counting logic as before
        const calculateStateCounts = (stateName, stateFeature) => {
          const stateNameUpper = stateName.toUpperCase()
          const stateNameLower = stateName.toLowerCase()
          const stateNameTitle =
            stateName.charAt(0).toUpperCase() + stateName.slice(1).toLowerCase()

          let stateBounds = null
          if (stateFeature.geometry) {
            const coords =
              stateFeature.geometry.type === 'Polygon'
                ? stateFeature.geometry.coordinates[0]
                : stateFeature.geometry.coordinates[0][0]
            let minLng = Infinity,
              maxLng = -Infinity,
              minLat = Infinity,
              maxLat = -Infinity
            coords.forEach((coord) => {
              minLng = Math.min(minLng, coord[0])
              maxLng = Math.max(maxLng, coord[0])
              minLat = Math.min(minLat, coord[1])
              maxLat = Math.max(maxLat, coord[1])
            })
            stateBounds = { minLng, maxLng, minLat, maxLat }
          }

          const userReports = stateBounds
            ? userReportsRef.current.features.filter((feature) => {
                const [lng, lat] = feature.geometry.coordinates
                return (
                  lng >= stateBounds.minLng &&
                  lng <= stateBounds.maxLng &&
                  lat >= stateBounds.minLat &&
                  lat <= stateBounds.maxLat
                )
              }).length
            : 0

          const borderStations = borderStationsRef.current.features.filter((feature) => {
            const state = feature.properties.state
            return (
              state &&
              (state.toUpperCase() === stateNameUpper ||
                state.toLowerCase() === stateNameLower ||
                state === stateNameTitle ||
                state === stateName)
            )
          }).length

          const officialCheckpoints = officialCheckpointsRef.current.features.filter(
            (feature) => {
              const location = feature.properties.location || ''
              return (
                location.toLowerCase().includes(stateNameLower) ||
                location.toUpperCase().includes(stateNameUpper) ||
                location.includes(stateName)
              )
            }
          ).length

          return {
            userReports,
            borderStations,
            officialCheckpoints,
          }
        }

        const counts = calculateStateCounts(stateName, stateFeature)
        setStateCounts(counts)
        setStateData(data)
        setSelectedState(stateName)
        setShowStateInfo(true)
      } catch (error) {
        console.error('Error loading state info:', error)
      }
    }

    // -------------------------------------------------------------------
    // 6. On map.load, add sources & layers and load initial data
    // -------------------------------------------------------------------
    map.on('load', () => {
      map.resize()

      // Add checkpoint sources first
      map.addSource('user-reports', {
        type: 'geojson',
        data: userReportsRef.current,
      })
      map.addSource('border-stations', {
        type: 'geojson',
        data: borderStationsRef.current,
      })
      map.addSource('official-checkpoints', {
        type: 'geojson',
        data: officialCheckpointsRef.current,
      })

      // Now load US states (which also re-adds the three layers on top)
      loadUSStates()

      // Load all checkpoint data
      loadCheckpointReports()
      loadBorderStations()
      loadOfficialCheckpoints()
    })

    return () => {
      if (map) map.remove()
    }
  }, [])

  // -------------------------------------------------------------------
  // 7. Whenever visibleLayers changes, update layer visibility
  // -------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // If a layer doesn’t exist yet, skip it gracefully
    try {
      map.setLayoutProperty(
        'user-reports-layer',
        'visibility',
        visibleLayers.userReports ? 'visible' : 'none'
      )
      map.setLayoutProperty(
        'official-checkpoints-layer',
        'visibility',
        visibleLayers.official ? 'visible' : 'none'
      )
      map.setLayoutProperty(
        'border-stations-layer',
        'visibility',
        visibleLayers.borderStations ? 'visible' : 'none'
      )
    } catch (e) {
      // Layers might not be ready, ignore errors
    }
  }, [visibleLayers])

  const handleLayerToggle = (layerKey) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }))
  }

  const handleCloseStateInfo = () => {
    setShowStateInfo(false)
    setSelectedState(null)
    setStateData(null)

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [-98.5795, 39.8283],
        zoom: 3.5,
        duration: 1000,
      })
    }
  }

  // Add escape key listener for state info panel
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleCloseStateInfo()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="overview-container">
      <div ref={mapContainerRef} className="overview-map" />

      {/* ------------------------------------------------------------------- */}
      {/* 8. Sidebar (or panel) for filtering checkbox UI */}
      {/* ------------------------------------------------------------------- */}
      <div className="filter-sidebar">
        <div className="filter-title">Show on Map</div>
        <div className="filter-checkbox-group">
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              checked={visibleLayers.userReports}
              onChange={() => handleLayerToggle('userReports')}
            />
            User Reported Checkpoints
          </label>
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              checked={visibleLayers.official}
              onChange={() => handleLayerToggle('official')}
            />
            Official Checkpoints
          </label>
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              checked={visibleLayers.borderStations}
              onChange={() => handleLayerToggle('borderStations')}
            />
            Border Stations
          </label>
        </div>
      </div>

      <div className="instruction">
        <p className="instruction-text">
          Click on any state to view detailed checkpoint information and zoom in
        </p>
      </div>

      <div className="legend">
        <div className="legend-title">Checkpoint Types</div>
        <div className="legend-item">
          <div className="legend-marker user-report"></div>
          <span className="legend-text">User Reported</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker official"></div>
          <span className="legend-text">Official Checkpoint</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker border-station"></div>
          <span className="legend-text">Border Station</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 9. State Info Panel (unchanged) */}
      {/* ------------------------------------------------------------------- */}
      <div className={`state-info-panel ${showStateInfo ? 'visible' : ''}`}>
        {stateData && (
          <>
            <div className="state-info-header">
              <h1 className="state-name">{selectedState}</h1>
              <button className="close-button" onClick={handleCloseStateInfo}>
                ×
              </button>
            </div>

            <div className="state-info-content">
              <div className="info-section">
                <h2 className="section-title">Checkpoint Summary</h2>
                <div className="info-item">
                  <span className="info-label">User Reported Checkpoints</span>
                  <span className="info-value">{stateCounts.userReports}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Official Checkpoints</span>
                  <span className="info-value">{stateCounts.officialCheckpoints}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Border Stations</span>
                  <span className="info-value">{stateCounts.borderStations}</span>
                </div>
              </div>

              {/* Repeat sections for DUI, Insurance, etc. as before */}
              <div className="info-section">
                <h2 className="section-title">DUI/Sobriety Checkpoints</h2>
                <div className="info-item">
                  <span className="info-label">Legal Status</span>
                  <span className="info-value">
                    <span
                      className={`legality-badge ${
                        stateData.dui_legality ? 'legal' : 'illegal'
                      }`}
                    >
                      {stateData.dui_legality ? 'Legal' : 'Illegal'}
                    </span>
                  </span>
                </div>
                {stateData.dui_info && (
                  <div className="info-item">
                    <span className="info-label">Details</span>
                    <span className="info-value">{stateData.dui_info}</span>
                  </div>
                )}
              </div>

              <div className="info-section">
                <h2 className="section-title">Insurance Checkpoints</h2>
                <div className="info-item">
                  <span className="info-label">Legal Status</span>
                  <span className="info-value">
                    <span
                      className={`legality-badge ${
                        stateData.insurance_legality ? 'legal' : 'illegal'
                      }`}
                    >
                      {stateData.insurance_legality ? 'Legal' : 'Illegal'}
                    </span>
                  </span>
                </div>
                {stateData.insurance_info && (
                  <div className="info-item">
                    <span className="info-label">Details</span>
                    <span className="info-value">{stateData.insurance_info}</span>
                  </div>
                )}
              </div>

              <div className="info-section">
                <h2 className="section-title">Drug Enforcement Checkpoints</h2>
                <div className="info-item">
                  <span className="info-label">Legal Status</span>
                  <span className="info-value">
                    <span
                      className={`legality-badge ${
                        stateData.drug_legality ? 'legal' : 'illegal'
                      }`}
                    >
                      {stateData.drug_legality ? 'Legal' : 'Illegal'}
                    </span>
                  </span>
                </div>
                {stateData.drug_info && (
                  <div className="info-item">
                    <span className="info-label">Details</span>
                    <span className="info-value">{stateData.drug_info}</span>
                  </div>
                )}
              </div>

              <div className="info-section">
                <h2 className="section-title">Immigration Checkpoints</h2>
                <div className="info-item">
                  <span className="info-label">Legal Status</span>
                  <span className="info-value">
                    <span
                      className={`legality-badge ${
                        stateData.immigration_legality ? 'legal' : 'illegal'
                      }`}
                    >
                      {stateData.immigration_legality ? 'Legal' : 'Illegal'}
                    </span>
                  </span>
                </div>
                {stateData.immigration_info && (
                  <div className="info-item">
                    <span className="info-label">Details</span>
                    <span className="info-value">{stateData.immigration_info}</span>
                  </div>
                )}
              </div>

              <div className="info-section">
                <h2 className="section-title">Informational Checkpoints</h2>
                <div className="info-item">
                  <span className="info-label">Legal Status</span>
                  <span className="info-value">
                    <span
                      className={`legality-badge ${
                        stateData.informational_legality ? 'legal' : 'illegal'
                      }`}
                    >
                      {stateData.informational_legality ? 'Legal' : 'Illegal'}
                    </span>
                  </span>
                </div>
                {stateData.info_info && (
                  <div className="info-item">
                    <span className="info-label">Details</span>
                    <span className="info-value">{stateData.info_info}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default OverviewMap
