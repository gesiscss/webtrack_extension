import React from 'react';
import ReactDOM from 'react-dom';

import 'framework7/css/framework7.bundle.css';
import './index.css';


import Framework7 from 'framework7/framework7.esm.bundle.js';
import Framework7React from 'framework7-react';
Framework7.use(Framework7React)

import App from './components/app/app.component.js';
import * as serviceWorker from './lib/serviceWorker';

import'./browser.css';
ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
// serviceWorker.register();
// //de.unild.webtrack/.MainActivity
