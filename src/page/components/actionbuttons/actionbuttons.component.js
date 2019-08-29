import React, { Component } from 'react';
import './actionbuttons.component.css';
import { Card, CardHeader, List, ListItem, Button, Toggle, ListItemRow } from 'framework7-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from "@fortawesome/fontawesome-free-solid"
import lang from '../../../lib/lang';
import ReactTooltip from 'react-tooltip'

export default class Actionbuttons extends Component {

  static defaultProps = {
    tooltip: true,
    allowSendData: false,
    allowPrivateTab: false,
    allowPrivateMode: false,
    sendDataCount: 0,
    activePrivateTab: false,
    activePrivateMode: false,
    onSendData : () => {},
    chancePrivateTab: () => {},
    chancePrivateMode: () => {}
  }

  constructor(props){
    super(props)
    this.handleTooglePrivateTab = this.handleTooglePrivateTab.bind(this);
    this.handleTooglePrivateMode = this.handleTooglePrivateMode.bind(this);
    this.state = {
      allowSendData: this.props.allowSendData,
      allowPrivateTab: this.props.allowPrivateTab,
      allowPrivateMode: this.props.allowPrivateMode,
      sendDataCount: this.props.sendDataCount,
      activePrivateTab: this.props.activePrivateTab,
      activePrivateMode: this.props.activePrivateMode
    };
  }

  /**
   * [on update set the permission for allow sendData, privatetab, privatemode & set count of data]
   * @param  {Object} nextProps
   */
  UNSAFE_componentWillReceiveProps(nextProps){
    this.setState({
      allowSendData: nextProps.allowSendData,
      allowPrivateTab: nextProps.allowPrivateTab,
      allowPrivateMode: nextProps.allowPrivateMode,
      sendDataCount: nextProps.sendDataCount
    });
  }

  /**
   * @param  {Boolean} boolean
   */
  handleTooglePrivateTab(boolean){
    this.setState({
      activePrivateTab: boolean
    });
    this.props.chancePrivateTab(boolean);
  }

  /**
   * @param  {Boolean} boolean
   */
  handleTooglePrivateMode(boolean){
    this.setState({
      activePrivateMode: boolean
    });
    this.props.chancePrivateMode(boolean);
  }

  /**
   * @return {Object|null}
   */
  _getSendData(){
    return this.state.allowSendData? <ListItem title={lang.project.send_data.title}>
                                            <p data-tip={this.state.sendDataCount>0? lang.project.send_data.isdata: lang.project.send_data.nodata}>
                                              <Button fill onClick={this.props.onSendData}>
                                                <FontAwesomeIcon icon={Icons.faCloudUploadAlt} />
                                                <span className="count" >{this.state.sendDataCount}</span>
                                              </Button>
                                             </p>
                                          </ListItem>: null
  }

  /**
   * @return {Object|null}
   */
  _getPrivateTab(){
    return this.state.allowPrivateTab? <ListItem title={lang.project.private_tab.title}>
                                          <p data-tip={this.state.activePrivateTab? lang.project.private_tab.onhelp: lang.project.private_tab.offhelp}>
                                            <Toggle slot="after" defaultChecked={this.state.activePrivateTab} onToggleChange={this.handleTooglePrivateTab} ></Toggle>
                                          </p>
                                        </ListItem>: null
  }

  /**
   * @return {Object|null}
   */
  _getPrivateMode(){
    return this.state.allowPrivateMode? <ListItem title={lang.project.private_mode.title}>
                                            <p data-tip={this.state.activePrivateMode? lang.project.private_mode.onhelp: lang.project.private_mode.offhelp}>
                                              <Toggle slot="after" defaultChecked={this.state.activePrivateMode} onToggleChange={this.handleTooglePrivateMode}  ></Toggle>
                                            </p>
                                        </ListItem>: null
  }

  render() {
    return (
      <div>
        <ReactTooltip effect='solid' place={'bottom'} />
        <Card className="actionbuttons">
          <List>
            {this._getPrivateTab()}
            {this._getPrivateMode()}
            {this._getSendData()}
          </List>
        </Card>
      </div>
     )
  }



}//class
