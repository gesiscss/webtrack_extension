import  React, { Component } from 'react';
import './history.component.css';
import { Actions, ActionsGroup, ActionsButton, ActionsLabel, Toggle } from 'framework7-react';

import LocalstorageHandler from '../../../lib/LocalstorageHandler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from "@fortawesome/fontawesome-free-solid"
import moment from 'moment';
import lang from '../../../lib/lang';

const STEPS = 5;
const DEFAULT_BETWEEN = {
  start: 0,
  end: STEPS
}

export default class History extends Component {

  static defaultProps = {
    allowSending: true,
    allowRemove: true,
    items: [],
    onSend: ()=>{},
    onRemove: ()=>{},
  }

  constructor(props){
    super(props);
    this.next = this.next.bind(this);
    this.back = this.back.bind(this);
    this.handleToogleFilter = this.handleToogleFilter.bind(this);
    this.id = null;
    this.storageBetween = new LocalstorageHandler('history-between', DEFAULT_BETWEEN);
    this.storageFilter = new LocalstorageHandler('history-filter', true);
    let items = this.getItems();
    this.state = Object.assign({
      between: this.storageBetween.get(),
      actionGridOpened: false
    }, items)
  }

  /**
   * [getItems return filtered and sorted array object-arrays]
   * @param  {Array} items    [default: this.props.items]
   * @param  {Number} start   [default: this.storageBetween.get().start]
   * @param  {Number} end     [default: this.storageBetween.get().end]
   * @return {Object}  [{items: [], nextItems: []}]
   */
  getItems(items=this.props.items, start=this.storageBetween.get().start, end=this.storageBetween.get().end){
    items = this.getFilterItems(items);
    if(this.storageFilter.get()) items = items.filter(e => !e.send)
    return {
      items: items.slice(start, end),
      nextItems: items.slice(end, end+STEPS)
    }
  }

  /**
   * [getFilterItems sort array after start time]
   * @param  {Array} items
   * @return {Array}
   */
  getFilterItems(items){    
    return items.sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }

  /**
   * [componentDidUpdate update between range in localstorage]
   * @param  {Object} nextProps
   * @param  {Object} nextState
   */
  componentDidUpdate(nextProps, nextState){
    this.storageBetween.set(nextState.between);
  }

  /**
   * [componentWillReceiveProps update items and nextItems]
   * @param  {Object} nextProps
   */
  componentWillReceiveProps(nextProps){
    this.setState(this.getItems(nextProps.items))
  }

  /**
   * [handleToogleFilter description]
   * @param  {[type]} boolean [description]
   * @return {[type]}         [description]
   */
  handleToogleFilter(boolean){
    this.storageFilter.set(boolean)
    this.storageBetween.set(DEFAULT_BETWEEN)
    this.setState(Object.assign({
      between: this.storageBetween.get()
    }, this.getItems()))
  }

  /**
   * [next added STEPS-value from state.between start and end. Set items and nextItems]
   */
  next(){
    this.setState(state => {
      state.between.start = state.between.start+STEPS;
      state.between.end = state.between.start+STEPS;
      const items = this.getItems(this.props.items, state.between.start, state.between.end);
      state.items = items.items
      state.nextItems = items.nextItems
      return state;
    });
  }

  /**
   * [back subtrect STEPS-value from state.between start and end. Set items and nextItems]
   */
  back(){
    this.setState(state => {
      state.between.start = state.between.start-STEPS>0? state.between.start-STEPS: 0;
      state.between.end = state.between.start+STEPS;
      const items = this.getItems(this.props.items, state.between.start, state.between.end);
      state.items = items.items
      state.nextItems = items.nextItems
      return state;
    })
  }

  /**
   * [getAction return framework7 Actionsheet]
   * @return {JSX}
   */
  getAction(){
    const SendButton = !this.props.allowSending? null: <ActionsButton onClick={()=> this.props.onSend(this.id)}>
                                                          <FontAwesomeIcon icon={Icons.faPaperPlane} />
                                                          <span>{lang.project.history.send_title}</span>
                                                        </ActionsButton>
    const DeleteButton = !this.props.allowRemove? null: <ActionsButton onClick={()=> this.props.onRemove(this.id)}>
                                                          <FontAwesomeIcon icon={Icons.faTrash} />
                                                          <span>{lang.project.history.delete_title}</span>
                                                        </ActionsButton>
    if(this.props.allowSending || this.props.allowRemove){
      return <Actions id="action" opened={this.state.actionGridOpened} onActionsClosed={() => this.setActionsGridOpened(false)} >
               <ActionsGroup>
                 <ActionsLabel>{lang.project.history.choose_action}</ActionsLabel>
                 {SendButton}
                 {DeleteButton}
               </ActionsGroup>
               <ActionsGroup>
                 <ActionsButton color="red">{lang.modal.abort}</ActionsButton>
               </ActionsGroup>
             </Actions>
    }else{
      return null;
    }
  }

  /**
   * [setActionsGridOpened open/close actionsheet]
   * @param {boolean} b
   */
  setActionsGridOpened(b=true){
    this.setState({
      actionGridOpened: b
    })
  }

  /**
   * [selectItem set select id and open actionsheet]
   * @param  {Number} id
   */
  selectItem(id){
    this.id = id;
    this.setActionsGridOpened()
  }


  render() {
      return (
      <div>
       <div className="card data-table history">
          <table>
            <thead>
              <tr>
                <th className="label-cell">{lang.project.history.table.title}</th>
                <th className="numeric-cell">{lang.project.history.table.time}</th>
              </tr>
            </thead>
            <tbody>
              {this.state.items.map((e, i) => <tr key={i} disabled={e.send} onClick={()=> !e.send? this.selectItem(e.id): ()=>{}} >
                                 <td className="label-cell">{new URL(e.url).host}</td>
                                 <td className="numeric-cell">{moment(e.start).format('YYYY-MM-DD HH:mm:ss')}</td>
                               </tr>)
              }
            </tbody>
          </table>
          <div className="data-table-footer">
            <Toggle defaultChecked={this.storageFilter.get()} color="blue" onToggleChange={this.handleToogleFilter} />
            <span className="data-table-pagination-label">{this.state.between.start>0? this.state.between.start+1: this.state.between.start}-{this.state.between.start+this.state.items.length} of {this.props.items.length}</span>
            <div className="data-table-pagination">
              <a href="#" onClick={this.back} className={this.state.between.start==0? "link disabled": "link"}>
                <i className="icon icon-prev color-gray"></i>
              </a>
              <a href="#"
                  onClick={this.next}
                  className={this.state.nextItems==0? "link disabled": "link"}
                >
                <i className="icon icon-next color-gray"></i>
              </a>
            </div>
          </div>
        </div>
       {this.getAction()}
      </div>
    );
  }


}
