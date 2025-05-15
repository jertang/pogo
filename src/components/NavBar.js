import React from 'react';
import { Link } from 'react-router-dom';

export function NavBar() {
    return (
        <div className='navbar'>
            <img src='img/UW-logo-512.png' alt="Logo" width= "130px" />
            <ul>
                <Link to='/' ><li>Home</li></Link>
                <Link to='/dashboard' ><li>Dashboard</li></Link>
                <Link to='/about' ><li>About</li></Link>
                <Link to='/contact' ><li>Contact</li></Link>
            </ul>
            <button>Report a Checkpoint</button>
        </div>
    );
}
