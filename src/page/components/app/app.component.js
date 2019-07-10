import React, { Component } from 'react';
import './app.component.css';
import Extension from '../../lib/Extension';
import lang from '../../../lib/lang';
import { App as MyApp, Statusbar, View, Page, Navbar, Toolbar, Link } from 'framework7-react';
import Loading from '../loading/loading.component';
import ProjektView from '../view/view.component';
import Project from '../project/project.component';
import Login from '../login/login.component';

export default class extends React.Component {

  constructor(props){
    super(props);
    this._openLoadScreen = this._openLoadScreen.bind(this);
    this.getPageHandler = this.getPageHandler.bind(this);
    this.getProjects = this.getProjects.bind(this);
    this.getCompanie = this.getCompanie.bind(this);
    this.extension = new Extension();
    this.state = {
      loadingScreenOpened: this.extension.requireUpdate,
      requireUpdate: this.extension.requireUpdate
    }
    this.f7params = {
      name: this.extension.companie.name,
      id: this.extension.id
    }
    this.routes = {
      view: {
        path: '/',
        component: ProjektView,
        options: {
          props: {
            getCompanie: this.getCompanie,
            getProjects: this.getProjects
          },
        },
      },
      project: {
        path: '/project/:id',
        component: Project,
        options: {
          props: {
            getCompanie: this.getCompanie,
            getPageHandler: this.getPageHandler
          },
        },
      },
      login: {
        path: '/login/:id',
        component: Login,
        options: {
          props: {
            getCompanie: this.getCompanie,
            getPageHandler: this.getPageHandler
          },
        },
      }
    }
    this.f7params = Object.assign(this.f7params, {routes: Object.values(this.routes)});
  }

  /**
   * [deliver list of projects]
   * @return {Array<object>}
   */
  getProjects(){
    return this.extension.pageHandler.getProjects()
  }

  /**
   * [get companie settings from 'defined/settings.js']
   * @return {Object}
   */
  getCompanie(){
    return this.extension.companie
  }

  /**
   * [deliver instance of PageHandler]
   * @return {Pagehandler}
   */
  getPageHandler(){
    return this.extension.pageHandler
  }

  /**
   * [set the state to open the loadscreen]
   * @param  {Boolean} [b=false]
   */
  _openLoadScreen(b=false){
    this.setState({
      loadingScreenOpened: b,
    })
  }

  componentDidMount(){
    if(!this.state.requireUpdate){
      let time = + new Date();
      if(this.extension.pageHandler){
        this.redirekt()
      }else{
        this._openLoadScreen(true);
        this.extension.event.on('onReady', (param) => {
          // if(time-(+new Date())<1000){
          //   setTimeout(() => this.redirekt(), 1000);
          // }else{
            this.redirekt()
          // }
        })
      }
    }
  }

  /**
   * [after load the configuration, then will be redirekt to the project view]
   * @return {[type]} [description]
   */
  redirekt(){
    this._openLoadScreen(false);
    if(this.extension.pageHandler.getSelect()!=null){
      this.$f7.views.main.router.navigate('/project/'+this.extension.pageHandler.getSelect());
    }else{
      this.$f7.views.main.router.navigate('/')
    }
  }

  render() {
    let msg = null;
    const { loadingScreenOpened, requireUpdate } = this.state;
    if(requireUpdate){
      msg = lang.requireUpdate;
    }
    return (
        <MyApp params={this.f7params}>
          <Loading opened={loadingScreenOpened} msg={msg}/>
          <View main />
        </MyApp>
    );
  }
}
