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
  const legalCheckpointsRef = useRef({
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

    const loadContributions = async () => {
      const { data, error } = await supabase.from('contributions').select('*')
      if (error) {
        console.error('Error fetching contributions:', error)
        return
      }

      const features = data.map((record) => ({
        type: 'Feature',
        properties: {
          contributor: record.contributor,
          content: record.content,
          type: 'contribution',
        },
        geometry: {
          type: 'Point',
          coordinates: [record.lng, record.lat],
        },
      }))

      geojsonRef.current.features.push(...features)
      map.getSource('places')?.setData(geojsonRef.current)
    }

    const loadLegalCheckpoints = async () => {
      const { data, error } = await supabase.from('legal_checkpoints').select('*')
      if (error) {
        console.error('Error fetching legal checkpoints:', error)
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
          type: 'legal_checkpoint',
        },
        geometry: {
          type: 'Point',
          coordinates: [record.long, record.lat],
        },
      }))

      legalCheckpointsRef.current.features = features
      map.getSource('legal_checkpoints')?.setData(legalCheckpointsRef.current)
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

      map.addSource('legal_checkpoints', {
        type: 'geojson',
        data: legalCheckpointsRef.current,
      })

      map.addLayer({
        id: 'legalCheckpointsLayer',
        type: 'circle',
        source: 'legal_checkpoints',
        paint: {
          'circle-radius': 8,
          'circle-color': '#0047AB',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      loadContributions()
      loadLegalCheckpoints()

      const legend = document.createElement('div')
      legend.className = 'map-legend'
      legend.innerHTML = `
        <div class="legend-title">Map Legend</div>
        <div class="legend-item">
          <span class="legend-marker legal-marker"></span>
          <span>Official Legal Checkpoint</span>
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
      const { content, contributor } = e.features[0].properties

      popup = new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`<p><b>${contributor}</b> <i>reported:</i> ${content}</p>`)
        .addTo(map)
    })

    map.on('mouseleave', 'placesLayer', () => {
      map.getCanvas().style.cursor = ''
      popup?.remove()
    })

    map.on('mouseenter', 'legalCheckpointsLayer', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      const { coordinates } = e.features[0].geometry
      const { checkpoint_name, city, state, description } = e.features[0].properties

      popup = new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="legal-checkpoint-popup">
            <h3>${checkpoint_name}</h3>
            <p><strong>Location:</strong> ${city}, ${state}</p>
            ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
            <p><em>Official Legal Checkpoint</em></p>
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseleave', 'legalCheckpointsLayer', () => {
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
