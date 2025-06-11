import React from 'react';
import { Link } from 'react-router-dom';

// Import your CSS file for styling
import './NavBar.css'; 

export function NavBar() {
    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/">
                    <img src="img/POGO_Logo.webp" alt="Logo" />
                </Link>
            </div>
            <ul className="navbar-links">
                <Link to='/' ><li>Overview</li></Link>
                <Link to='/about' ><li>About the Project</li></Link>
                <Link to='/contact' ><li>Contact Us</li></Link>
            </ul>
            <div className="navbar-action">
                <Link to='/report'><button className="report-btn">Report a Checkpoint</button></Link>
            </div>
        </nav>
    );
}

