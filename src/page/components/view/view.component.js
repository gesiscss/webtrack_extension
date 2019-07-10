import React, { Component } from 'react';
import './view.component.css';
import { Page, NavTitle, List, ListItem, AccordionContent, Block, BlockTitle, Col, Button, Row } from 'framework7-react';
import Headerlogo from '../headerlogo/headerlogo.component';
import lang from '../../../lib/lang';

export default class View extends Component {

  static defaultProps = {
    getCompanie: () => {},
    getProjects: () => {}
  }

  constructor(props){
    super(props);
    this.state = {
      projects:  this.props.getProjects()
    }
  }

  /**
   * @return {JSX|Null}
   */
  getProjects(){
    if(this.state.projects!=null){
      return this.state.projects.map((e, i)=> <ListItem key={i} accordionItem title={e.NAME}>
          <AccordionContent>
            <Block>
              <p>{e.DESCRIPTION}</p>
              <Col tag="span">
                <Button onClick={() => this.$f7.views.main.router.navigate('/project/'+e.ID)} fill>{lang.projects.startTitle}</Button>
              </Col>
            </Block>
          </AccordionContent>
        </ListItem>)
    }else{
      return null
    }
  }


  render() {
    const content = this.state.projects.length>0?
                    <div>
                      <BlockTitle>{lang.projects.select}</BlockTitle>
                      <List accordionList>
                        {this.getProjects()}
                      </List>
                    </div>
                    :
                    <Block strong>
                      <p>{lang.projects.nolist}</p>
                    </Block>


    return (
      <Page name={this.constructor.name.toLowerCase()} >

        <Headerlogo name={this.props.getCompanie().name} >
            <NavTitle>{lang.projects.title}</NavTitle>
        </Headerlogo>
        {content}

      </Page>
     )
  }



}//class
