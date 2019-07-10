import React, { Component } from 'react';
import Parser from 'html-react-parser';
import lang from '../../../lib/lang';

import { Page, NavTitle, Block, Segmented, Button } from 'framework7-react';
import Headerlogo from '../headerlogo/headerlogo.component';

export default class Project extends Component {

  constructor(props){
    super(props);
    this.dialog = null;
    this.state = {
      dialog: null
    }
  }

  /**
   * [check if the dialog is open]
   * @return {Boolean}
   */
  isDialog(){
    return this.state.hasOwnProperty('dialog') && this.state.dialog != null;
  }

  openDialog(){
    return this.state.dialog
  }

  closeDialog(){
    this.setState({
      dialog: null
    })
  }

  /**
   * [open the dialog with your options]
   * @param  {Object} options
   */
  _getDialog(options){
    if(typeof options.text === 'string') options.text = Parser(options.text);
    this.setState({
      dialog: <Page name={'dialog'} >
                <Headerlogo name={this.props.getCompanie().name} >
                    <NavTitle>{options.title}</NavTitle>
                </Headerlogo>
                <Block>{options.text}</Block>
                <Block>
                  <Segmented raised tag="p">
                    {options.buttons.map((button, i) => {
                      button.key = i;
                      return <Button fill {...button} />
                    })}
                  </Segmented>
                </Block>
              </Page>
    })
  }

  /**
   * [alert message]
   * @param  {Object} [options={}] [description]
   * @return {Jsx}
   */
  alert(options={}){
    return new Promise((resolve, reject) => {
      let button = {
          text:  lang.modal.ok,
          onClick: () => {
            this.closeDialog();
            resolve(true);
          }
      };
      let defaultOptions = {
        title: 'Title',
        text: 'Text',
        buttons: [button]
      }
      if(options.hasOwnProperty('error') && options.error){
        // button. = true;
        button.color = 'red';
        defaultOptions.title = 'Error'
      }
      options = Object.assign({}, defaultOptions, options);
      return this._getDialog(options)
    });
  }

  /**
   * @param  {Object} [options={}]
   * @return {Jsx}
   */
  confirm(options={}){
    return new Promise((resolve, reject) => {
      let buttons = [
        {
          text: lang.modal.abort,
          onClick: () => {
            this.closeDialog();
            resolve(false);
          }
        },
        {
          text:  lang.modal.success,
          color: "green",
          onClick: () => {
            this.closeDialog();
            resolve(true);
          }
        }
      ];
      options = Object.assign({}, {
        title: 'Title',
        text: 'Text',
        buttons: buttons
      }, options);
      return this._getDialog(options)
    });
  }

  /**
   * @param  {String} [text='']
   * @return {Object}
   */
  getPreloader(text=''){
    return this.$f7.dialog.preloader(text);
  }

}//class
