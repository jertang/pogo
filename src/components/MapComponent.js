// MapComponent.js
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { createClient } from '@supabase/supabase-js'
import 'maplibre-gl/dist/maplibre-gl.css'

// Supabase setup
const supabaseUrl = 'https://yybdwyflzpzgdqanrbpa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YmR3eWZsenB6Z2RxYW5yYnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg0NDYsImV4cCI6MjA2MjQxNDQ0Nn0.P5frBEg6mUQqfYIcGtKDYUSpG-po6wla7zsz3PTgYgw'
const supabase = createClient(supabaseUrl, supabaseKey)

const MapComponent = () => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const geojsonRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })
  const borderStationsRef = useRef({
    type: 'FeatureCollection',
    features: [],
  })

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:
        'https://api.maptiler.com/maps/0196cd3f-fb75-77c7-b9fc-336a56159c73/style.json?key=6Yi2lIi7fKDCpeBAXoYW',
      center: [-98.5795, 39.8283],
      zoom: 2.5,
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
          station_name: record.station_name,
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
      map.getSource('border_stations')?.setData(borderStationsRef.current)
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
        data: borderStationsRef.current,
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
          <div style="background: white; padding: 12px; border-radius: 8px; max-width: 250px;">
            <h4 style="margin: 0 0 8px 0; color: #B42222;">User Reported Checkpoint</h4>
            <p><strong>Type:</strong> ${checkpoint_type}</p>
            <p><strong>Agency:</strong> ${agency}</p>
            <p><strong>Date:</strong> ${date_observed}</p>
            ${details ? `<p><strong>Details:</strong> ${details}</p>` : ''}
            ${using_technology ? `<p><strong>Technology Used:</strong> Yes</p>` : ''}
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
      const { station_name, city, state, description } = e.features[0].properties

      popup = new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="legal-checkpoint-popup">
            <h3>${station_name}</h3>
            <p><strong>Location:</strong> ${city}, ${state}</p>
            ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
            <p><em>Border Patrol Station</em></p>
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseleave', 'borderStationsLayer', () => {
      map.getCanvas().style.cursor = ''
      popup?.remove()
    })

    return () => {
      map.remove()
    }
  }, [])

  return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
}

export default MapComponent