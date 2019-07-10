import React, { Component } from 'react';
import './schedule.component.css';
import { BlockHeader, Block, BlockFooter, Button } from 'framework7-react';
import {UnmountClosed} from 'react-collapse';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from "@fortawesome/fontawesome-free-solid"
import moment from 'moment';
import lang from '../../../lib/lang';

const DAYS = {'SUN': 'sunday', 'MON': 'monday', 'TUE': 'tuesday', 'WED': 'wednesday', 'THU': 'thursday', 'FRI': 'friday', 'SAT': 'saturday'};

export default class Actionbuttons extends Component {

  static defaultProps = {
    seconds: 0,
    plan: {'START': 840, 'END': 1440,  'MON': true, 'TUE': true, 'WED': true, 'THU': true, 'FRI': true, 'SAT': true, 'SUN': true}
  }

  constructor(props){
    super(props);
    this.now = new Date().getTime();
    this.state = {
      open: false
    }
    this.handleOpen = this.handleOpen.bind(this);
  }

  /**
   * @return {String}
   */
  getNextPeriode(){
     return moment(new Date(this.now+this.props.seconds)).format('DD.MM.YYYY HH:mm').split(' ');
  }

  /**
   * [open/close the BlockFooter]
   */
  handleOpen(){
    this.setState({
      open: !this.state.open
    })
  }

  /**
   * [format min in hours:minutes]
   * @param  {Number} min
   * @return {String}
   */
  getHHMM(min){
    var sec_num = parseInt(min*60, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    if (hours   < 10) hours   = "0"+hours;
    if (minutes < 10) minutes = "0"+minutes;
    return hours+':'+minutes;
  }

  /**
   * [deliver the output string]
   * @return {String}
   */
  getPlan(){
    let days = '';
    let first  = true;
    for (let d in lang.days) {
      if(this.props.plan[d]){
        if(!first) days += ','
        first = false;
        days += ' '+lang.days[d];
      }
    }
    return lang.project.schedule.footer
              .replace('%days', days)
              .replace('%start', this.getHHMM(this.props.plan.START))
              .replace('%end', this.getHHMM(this.props.plan.END))
  }



  render() {
    const [date, clock] = this.getNextPeriode();
    const blockText = lang.project.schedule.block.replace('%date', date).replace('%clock', clock);

    return (
      <div className="schedule" >
        <BlockHeader>{lang.project.schedule.header}</BlockHeader>
        <Block className="bg-color-yellow" >
          <p>{blockText}</p>
          <Button onClick={this.handleOpen} >{lang.project.schedule.button}</Button>
        </Block>
        <UnmountClosed isOpened={this.state.open}>
          <BlockFooter>{this.getPlan()}</BlockFooter>
        </UnmountClosed>
      </div>
     )
  }



}//class
