import React from 'react';
import { Link } from 'react-router-dom';

// Import your CSS file for styling
import './NavBar.css'; 

export function NavBar() {
    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/">
                    <img src="img/UW-logo-512.png" alt="UW Logo" />
                </Link>
            </div>
            <ul className="navbar-links">
                <Link to='/' ><li>Overview</li></Link>
                <Link to='/dashboard' ><li>Dashboard</li></Link>
                <Link to='/methodology' ><li>Methodology</li></Link>
                <Link to='/about' ><li>About the Project</li></Link>
                <Link to='/contact' ><li>Contact Us</li></Link>
            </ul>
            <div className="navbar-action">
                <button className="report-btn">Report a Checkpoint</button>
            </div>
        </nav>
    );
}

