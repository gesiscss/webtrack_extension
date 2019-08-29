import React, { Component } from 'react';
import './loading.component.css';
import { LoginScreen, Page, Block } from 'framework7-react';
import track from '../../assets/track.png';
import arrow from '../../assets/arrow.png';
import { ClipLoader } from 'react-spinners';

export default class Loading extends Component {

  static defaultProps = {
    opened: false,
    msg: null
  }

  constructor(props){
    super(props);
    this.state = {
      opened: this.props.opened,
      msg: this.props.msg
    }
  }

  /**
   * [update the state by changing the props]
   * @param  {Object} nextProps
   */
  UNSAFE_componentWillReceiveProps(nextProps){
    this.setState(nextProps);
  }


  render() {
    let content = (<ClipLoader sizeUnit={"px"} size={40} color={'#ffffff'} />);
    if(this.state.msg){
      content = <Block>{this.state.msg}</Block>
    }

    return (
      <LoginScreen className="loading-screen" opened={this.state.opened}>
          <Page noToolbar noNavbar noSwipeback loginScreen>
              <img  src={arrow} alt="arrow" className="arrow" id="top_left" />
              <img  src={arrow} alt="arrow" className="arrow" id="top_right" />
              <img  src={arrow} alt="arrow" className="arrow" id="bottom_left" />
              <img  src={arrow} alt="arrow" className="arrow" id="bottom_right" />
              <div className="arrow-wrapper" >
                <img  src={track} alt="track" id="track" />
                {content}
              </div>
          </Page>
      </LoginScreen>
     )
  }



}//class
