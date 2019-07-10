import React, { Component } from 'react';
import './headerlogo.component.css';
import track from '../../assets/track.png';
import arrow from '../../assets/arrow.png';


import { Navbar, Subnavbar } from 'framework7-react';

export default class Headerlogo extends React.Component {

  static defaultProps = {
    name: 'Name',
    children: []
  }

  render(){
    return <Navbar>
            <div id="headerTop" >
              <img  src={arrow} alt="arrow" className="arrow" id="top_left" />
              <img  src={arrow} alt="arrow" className="arrow" id="top_right" />
              <img  src={arrow} alt="arrow" className="arrow" id="bottom_left" />
              <img  src={arrow} alt="arrow" className="arrow" id="bottom_right" />
              <div className="arrow-wrapper" >
                <img  src={track} alt="track" id="track" />
                <span className="background" />
                <h1 id="projectname" className="App-title">{this.props.name}</h1>
              </div>
            </div>
            <Subnavbar>
              {React.Children.map(this.props.children, (child, i) => child )}
            </Subnavbar>
        </Navbar>
  }

}
