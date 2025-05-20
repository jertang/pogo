// MapComponent.jsx
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { createClient } from '@supabase/supabase-js'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapComponent.css'

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
      zoom: 4,
    })

    mapRef.current = map

    // Fetch contributions
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
          type: 'contribution'
        },
        geometry: {
          type: 'Point',
          coordinates: [record.lng, record.lat],
        },
      }))

      geojsonRef.current.features.push(...features)

      map.getSource('places')?.setData(geojsonRef.current)
    }

    // Fetch legal checkpoints
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
          type: 'legal_checkpoint'
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
      // Add source and layer for user contributions
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

      // Add source and layer for legal checkpoints
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

      // Load data for both sources
      loadContributions()
      loadLegalCheckpoints()
      
      // Add map legend
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

    // Popup for user contributions
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

    // Popup for legal checkpoints
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

    map.on('click', (e) => {
      // Check if click is on a legal checkpoint, if so, do nothing
      const features = map.queryRenderedFeatures(e.point, { 
        layers: ['legalCheckpointsLayer'] 
      });
      
      if (features.length > 0) {
        return; // Don't open submission popup if clicking on a legal checkpoint
      }
      
      // Standard user contribution form
      popup?.remove()

      const popupContent = `
        <div id="popup">
          <input type="text" id="name" placeholder="Your name..." />
          <input type="text" id="content" placeholder="Describe the checkpoint..." />
          <button id="submit">Submit</button>
        </div>
      `

      popup = new maplibregl.Popup({ closeOnClick: false })
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map)

      setTimeout(() => {
        const submitBtn = document.getElementById('submit')
        submitBtn?.addEventListener('click', () => handleSubmit(e.lngLat, popup))
      }, 0)
    })

    return () => {
      map.remove()
    }
  }, [])

  const handleSubmit = async (lngLat, popupInstance) => {
    const contributor = document.getElementById('name')?.value
    const content = document.getElementById('content')?.value

    try {
      const { data, error } = await supabase
        .from('contributions')
        .insert([{ contributor, content, lat: lngLat.lat, lng: lngLat.lng }])
        .select()

      if (error) throw error

      const newFeature = {
        type: 'Feature',
        properties: { 
          contributor, 
          content,
          type: 'contribution' 
        },
        geometry: {
          type: 'Point',
          coordinates: [lngLat.lng, lngLat.lat],
        },
      }

      geojsonRef.current.features.push(newFeature)
      popupInstance.remove()

      const map = mapRef.current
      map?.getSource('places')?.setData(geojsonRef.current)
    } catch (err) {
      console.error('Error submitting:', err)
    }
  }

  return <div ref={mapContainerRef} style={{ height: '100vh', width: '100%' }} />
}

export default MapComponent
