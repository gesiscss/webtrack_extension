import React, { Component } from 'react';
import './login.component.css';
import { Page, NavTitle, List, ListInput, Block, Col, Button } from 'framework7-react';
import Headerlogo from '../headerlogo/headerlogo.component';
import lang from '../../../lib/lang';


export default class Login extends Component {

  static defaultProps = {
    id: null,
    getCompanie: ()=>{},
    getPageHandler: ()=>{}
  }

  constructor(props){
    super(props);
    try {
      this.handleAbortLogin = this.handleAbortLogin.bind(this);
      this.handleSignIn = this.handleSignIn.bind(this);
      this._handleSubmit = this._handleSubmit.bind(this);
      this._handleChange = this._handleChange.bind(this);
      this.id = parseInt(this.props.id, 10)
      this.pageHandler = this.props.getPageHandler();
      this.project = this.pageHandler.getProject(this.id);
      this.debug = true;

      this.MIN_LENGTH = this.project.SETTINGS.CHECK_CLIENTIDS? 1: 8;
      this.state = {
        id: '',
        warning: null
      }
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * [redirect to the root]
   */
  handleAbortLogin(){
    this.pageHandler.selectProject(null);
    this.$f7.views.main.router.navigate('/')
  }

  /**
   * [set the client id to the project]
   * @param  {String} clientId
   * @return {Promise}
   */
  signIn(clientId){
    return new Promise(async (resolve, reject)=>{
      try {
        if (this.debug) console.log('-> signIn');
        if(await this.pageHandler.setClientId(clientId)){
          if(this.pageHandler.tracker==null){
            this.pageHandler._createTracker();
          }
          this.pageHandler._setCurrentTrackerPrivateMode(false);
          resolve();
        }else{
          this.pageHandler._setCurrentTrackerPrivateMode(true);
          reject(lang.project.id_not_found);
        }
      } catch (e) {
        console.warn(e);
        reject(e)
      }
    });
  }

  /**
   * [set the state id and redirect to the project view]
   */
  async handleSignIn(){
    try {
      await this.signIn(this.state.id);
      this.$f7.views.main.router.navigate('/project/'+this.props.id)
    } catch (e) {
      this.setState({
        warning: this._getWarning(e)
      })
    }
  }

  /**
   * @param  {any} e
   */
  _handleChange(e){
    this.setState({
      id: e.target.value,
      warning: e.target.value.length<this.MIN_LENGTH? this._getWarning(lang.loggin.error_id_length.replace(/%s/g, this.MIN_LENGTH)): null
    });
  }

  /**
   * [format text in warning message]
   * @param  {string} text
   * @return {jsx}
   */
  _getWarning(text){
    return (<p className="error color-red" >{text}</p>)
  }

  /**
   * [_handleSubmit handle submit event]
   * @param  {any} event
   */
  _handleSubmit(event){
    event.preventDefault();
    if(this.state.id<this.MIN_LENGTH){
      this.setState({
        warning: this._getWarning(lang.loggin.error_id_length.replace(/%s/g, this.MIN_LENGTH))
      });
    }else{
      this.handleSignIn()
    }
  }

  render() {
    return (
      <Page name={this.constructor.name.toLowerCase()} >
        <Headerlogo name={this.props.getCompanie().name} >
            <NavTitle>{this.project.NAME}</NavTitle>
        </Headerlogo>

        <List>
          <Block>
            <p>{lang.loggin.invitation}</p>
            {this.state.warning}
          </Block>
        </List>

        <form onSubmit={this._handleSubmit} >
          <List>
            <ListInput
              label={lang.loggin.input_label}
              type="text"
              placeholder={lang.loggin.placeholder}
              value={this.state.id}
              onInput={this._handleChange}
            />
            <Block>
              <Col tag="span">
                <Button disabled={this.state.id.length<this.MIN_LENGTH} onClick={this.handleSignIn} fill>{lang.loggin.submit}</Button>
              </Col>
            </Block>
          </List>
        </form>

      </Page>
     )
  }



}//class
