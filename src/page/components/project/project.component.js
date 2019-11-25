import React, { Component } from 'react';
import './project.component.css';
import { Page, NavTitle, Toolbar, Tabs, Tab, Link, Block } from 'framework7-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from "@fortawesome/fontawesome-free-solid"
import track from '../../assets/track.png';
import LocalstorageHandler from '../../../lib/LocalstorageHandler';
import DefaultComponent from '../default/default.component';
import Headerlogo from '../headerlogo/headerlogo.component';
import Actionbuttons from '../actionbuttons/actionbuttons.component';
import History from '../history/history.component';
import Schedule from '../schedule/schedule.component';
import lang from '../../../lib/lang';

export default class Project extends DefaultComponent {

  static defaultProps = {
    id: null,
    getCompanie: ()=>{},
    getPageHandler: ()=>{}
  }

  constructor(props){
    super(props)
    this.debug = true;
    if (this.debug) console.log('Project.constructor() - project.component.js');
    if (this.debug) console.log(props);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleDeletePage = this.handleDeletePage.bind(this);
    this.handleSendPage = this.handleSendPage.bind(this);
    this.handleSendData = this.handleSendData.bind(this);
    this.handleSend = this.handleSend.bind(this);
    this.handleChancePrivateTab = this.handleChancePrivateTab.bind(this);
    this.handleChancePrivateMode = this.handleChancePrivateMode.bind(this);
    this.storage = new LocalstorageHandler('activeTab', 0);
    this.state = {
      requireLogin: false,
      available: true,
      projectName: '',
      check_id: false,
      pages: [],
      count: 0
    }
    this.project = null;
    this.schedule = 0;
  }

  /**
   * [initalization the cross view with pageHandler]
   */
  async componentDidMount(){
    if (this.debug) console.log('-> Project.componentDidMount() - project.component.js');
    try {
      this.pageHandler = this.props.getPageHandler();
      if (this.debug) this.pageHandler.log('-> Project.componentDidMount() - project.component.js (try{})');
      
      if(!this.pageHandler.isProjectAvailable(this.props.id)){
        this.setState({
          projectName: lang.project.unavailable.title,
          available: false,
        })
        return;
      }

      await this.pageHandler.selectProject(this.props.id);
      this.project =  this.pageHandler.getProject(this.props.id);
      this.settings =  this.pageHandler.getProjectsTmpSettings()[this.props.id];
      this.schedule = this.pageHandler.getNextPeriode();

      if(this.project.SETTINGS.ENTERID && this.settings.clientId == null){
        setTimeout(()=> this.$f7.views.main.router.navigate('/login/'+this.props.id), 1000);
      }else{

        let pages = this.pageHandler.getPages();
        let privateTab = await this.pageHandler.isTabPrivate();
        this.setState({
          available: true,
          activePrivateTab: privateTab,
          activePrivateMode: this.settings.privateMode,
          projectName: this.project.NAME,
          pages: pages,
          sendDataCount: pages.filter(e=>e.send===false).length
        });

        // TODO: I am using once as I have now way to detect when the dialog is being
        // closed, e.g. componentWillUnmount does not work
        //this.pageHandler._getCurrentTracker().event.once('onSend', this.handleSend);
        this.pageHandler._getCurrentTracker().addOnSendListener(this.handleSend);
      }
      if (this.debug) this.pageHandler.log('<- Project.componentDidMount() - project.component.js (try{})');
    } catch (err) {
      console.warn(err);
      this.alert({error: true, text: err.stack})
    }

    if (this.debug) console.log('<- Project.componentDidMount() - project.component.js');
  }

  
  async update(){
    if (this.debug) this.pageHandler.log('-> Project.update() - project.component.js');
    let pages = this.pageHandler.getPages();
    this.setState({
      activePrivateTab: await this.pageHandler.isTabPrivate(),
      activePrivateMode: this.settings.privateMode,
      pages: pages,
      sendDataCount: pages.filter(e=>e.send===false).length
    });
    if (this.debug) this.pageHandler.log('<- Project.update() - project.component.js');
  }

  /**
   * [logout and redirect to root path]
   * @return {Promise} [description]
   */
  async handleLogout(){
    if(!this.state.available || await this.confirm({title: lang.project.logout_title, text: lang.project.logout.replace(/%s/g, this.project.NAME)})){
      this.pageHandler.selectProject(null);
      this.$f7.views.main.router.navigate('/')
    }
  }

  /**
   * @param  {String} id
   */
  async handleDeletePage(id){
    try {
      if(await this.confirm({title: lang.project.history.delete_title, text: lang.project.history.delete})){
        await this.pageHandler.deletePage(id);
        this.update();
      }
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * @param  {String} id
   */
  handleSendPage(id){
    this.pageHandler.sendData([id]);
  }


  async handleSendData(){
    try {
      if(await this.confirm({title: lang.project.send_data.title, text: lang.project.send_data.question})){
        this.pageHandler.sendData();
      }
    } catch (err) {
      console.warn(err);
      this.alert({error: true, text: err.stack})
    }

  }

  /**
   * @param  {Boolean} boolean
   */
  handleSend(boolean){
    if (this.debug) this.pageHandler.log('-> handleSend');
    if(this.dialog!=null){
      this.update();
    }
    if (this.debug) this.pageHandler.log('<- handleSend');
  }

  /**
   * [handleChancePrivateTab set the state of pageHandler for private tab]
   * @param  {Boolean} boolean [description]
   */
  handleChancePrivateTab(boolean){
    this.pageHandler.setTabPrivate(boolean);
  }

  /**
   * [handleChancePrivateMode set the state of pageHandler for private mode]
   * @param  {Boolean} boolean
   */
  handleChancePrivateMode(boolean, component){
    this.pageHandler.setPrivateMode(boolean, component);
  }

  /**
   * @return {Object} {name: String, allow: Boolean, default: Boolean, content: JSX} | {allow: false}
   */
  _getHistory(){
    if(this.project==null){
      return {allow: false}
    }else {
      return {
        name: 'history',
        allow: this.project.SETTINGS.SHOWHISTORY,
        default: false,
        icon: <FontAwesomeIcon icon={Icons.faClock} size="lg" />,
        content: <History items={this.state.pages} onSend={this.handleSendPage} onRemove={this.handleDeletePage} allowRemove={this.settings.EDITHISTORY} allowSending={!this.settings.SENDDATAAUTOMATICALLY} />
      }
    }
  }

  /**
   * @return {Object} {name: String, allow: Boolean, default: Boolean, content: JSX} | {allow: false}
   */
  _getActionbuttons(){
    if(this.project==null){
      return {allow: false}
    }else {
      const actionbuttons = <Actionbuttons
               allowSendData={!this.project.SETTINGS.SENDDATAAUTOMATICALLY}
               allowPrivateTab={this.project.SETTINGS.PRIVATETAB && this.schedule==0}
               allowPrivateMode={this.project.SETTINGS.PRIVATEBUTTON && this.schedule==0}
               activePrivateTab={this.state.activePrivateTab}
               activePrivateMode={this.state.activePrivateMode}
               sendDataCount={this.state.sendDataCount}
               onSendData={this.handleSendData}
               chancePrivateTab={this.handleChancePrivateTab}
               chancePrivateMode={this.handleChancePrivateMode}
             />;
      const schedule = <Schedule seconds={this.schedule} plan={this.project.SCHEDULE} />
      return {
        name: 'actionbuttons',
        allow: this.project.SETTINGS.SENDDATAAUTOMATICALLY || this.project.SETTINGS.PRIVATETAB || this.project.SETTINGS.PRIVATEBUTTON,
        default: false,
        icon: <FontAwesomeIcon icon={Icons.faSlidersH} size="lg" />,
        content: this.schedule>0? schedule: actionbuttons
      }
    }
  }

  /**
   * [set the state id from localstorage tab from Toolbar]
   * @param  {String} i
   */
  activeTab(i){
    this.storage.set(i)
  }

  render() {
    if(this.isDialog()) return this.openDialog();
    
    let content = null; 
    
    if(!this.state.available){
      content = (<Block>
        {lang.project.unavailable.content}
      </Block>);
    } else {
      const tabs = [this._getActionbuttons(), this._getHistory()].filter(e => e.allow);
      if(tabs[this.storage.get()]){
        tabs[this.storage.get()].default = true;
      }
      content = (<div>
          <Tabs>
            {tabs.map((e, i) =>
              <Tab id={'tab'+i} key={i} className={['page-content', 'tab-'+e.name].join(' ')} tabActive={e.default} >
                {e.content}
              </Tab>
            )}
          </Tabs>
          <Toolbar tabbar position={'bottom'}>
            {tabs.map((e, i) => <Link key={i} tabLink={'#tab'+i} onClick={()=> this.activeTab(i)} tabLinkActive={e.default} >
                {e.icon}
              </Link>
            )}
          </Toolbar>
      </div>)
    }

    return (
      <Page name={this.constructor.name.toLowerCase()} >
        <Headerlogo name={this.props.getCompanie().name} >
            <NavTitle>{this.state.projectName}</NavTitle>
            <span><a href="#" slot="nav-right" onClick={this.handleLogout} ><FontAwesomeIcon icon={Icons.faSignOutAlt} /></a></span>
        </Headerlogo>
        {content}      
      </Page>
     )
  }


}//class
