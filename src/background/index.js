import "babel-polyfill"
import Transfer from './core/Transfer';
import Configuration from './core/Configuration';
import TrackingHandler from './core/TrackingHandler';
import PageHandler from './core/PageHandler';
// import LocalstoreDB from './core/LocalstoreDB';
// import ErrorCache from './core/ErrorCache';
import settings from '../lib/settings';

//const errorCache = new ErrorCache();




(async function main() {

  
  console.log('Start', new Date(), settings.server);
  var transfer = new Transfer(settings.server);
  transfer.startInstallation();

  window.addEventListener("unhandledrejection", event => {
    console.warn(`UNHANDLED PROMISE REJECTION: `, event.reason, 
      '. Have you added the certificates by visiting the server page?');
  });

  window.requireUpdate = false;
  if(settings.requireVersion.hasOwnProperty(settings.getBrowser().name) && settings.requireVersion[settings.getBrowser().name] > settings.getBrowser().version){
    console.error('PLEASE UPDATE YOUR BROWSER');
    window.requireUpdate = true;
  }
  
  // await errorCache.createDB();
  // console.log('Created Error DB');
  window.xbrowser = window.hasOwnProperty('chrome') ? chrome : browser;
  window.settings = settings;
  window.companie = settings.companie;

  window.pageHandler = null;

  window.config = new Configuration(settings, transfer);

  //console.log('Create PageHandler');
  window.pageHandler = new PageHandler(config, transfer, window.tracker);
  await window.pageHandler.init();
  //console.log('PageHandler Initialized');
  //window.pageHandler.event.on('error', error => errorCache.add(error));
  
  transfer.endInstallation();


})();
