import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Import CSS
import 'bootstrap/dist/css/bootstrap.min.css';

import { Report } from '../pages/Report';
import { Home } from '../pages/Home';
import { About } from '../pages/About';
import { Contact } from '../pages/Contact';
import { NavBar } from './NavBar';

function App(props) {
  return (
    <div>
      <NavBar />
      <div style={{ position: 'relative' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/report" element={<Report />} />
        </Routes> 
      </div>
      <footer className="text-center">
        <p>© 2025 UW Geog469. All rights reserved.</p>
      </footer>
    </div> 
  );
}

export default App;