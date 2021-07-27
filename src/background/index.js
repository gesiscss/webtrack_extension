import "babel-polyfill"
import Transfer from './core/Transfer';
import Configuration from './core/Configuration';
import TrackingHandler from './core/TrackingHandler';
import PageHandler from './core/PageHandler';
// import LocalstoreDB from './core/LocalstoreDB';
// import ErrorCache from './core/ErrorCache';
import settings from '../lib/settings';

//const errorCache = new ErrorCache();





async function load_controllists(xbrowser) {
    // Loading controllists
    var specials = {};
    await fetch(xbrowser.runtime.getURL('data/specials.json')).then(
      (response) => response.json()).then((json) => {
        for (let key in json) {
          specials[key] = new Set(json[key]);
        }
    });

    var filters = {};
    await fetch(xbrowser.runtime.getURL('data/filters.json')).then(
      (response) => response.json()).then((json) => {
        for (let key in json) {
          filters[key] = new Set(json[key]);
        }
    });

    var simple = {};
    await fetch(xbrowser.runtime.getURL('data/simple.json')).then(
      (response) => response.json()).then((json) => {
        for (let key in json) {
          simple[key] = new Set(json[key]);
        }
    });


    // uncomment to load the tests.json file to perform tests
    // CHECKED: test_domainonly.json, test_urlonly.json, test_fulldeny.json,
    // test_fullallow.json, test_porn.json
    ///////////////////////////////////////////////////////////
    // var tests = null;
    // await fetch(xbrowser.runtime.getURL('data/test_domain.json')).then(
    //   (response) => response.json()).then((json) => {
    //     tests = json;
    // });

    // console.log(tests);
    // return { 
    //   'specials':specials, 
    //   'filters': filters, 
    //   'simple': simple,
    //   'tests': tests
    // }
    ////////////////////////////////////////////////////////////

    return { 
      'specials':specials, 
      'filters': filters, 
      'simple': simple,

    }

}


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

  let controllists = await load_controllists(window.xbrowser);

  window.config = new Configuration(settings, transfer, controllists);

  //console.log('Create PageHandler');
  window.pageHandler = new PageHandler(config, transfer, window.tracker);
  await window.pageHandler.init();
  //console.log('PageHandler Initialized');
  //window.pageHandler.event.on('error', error => errorCache.add(error));
  
  transfer.endInstallation();


})();
