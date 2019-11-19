import "babel-polyfill"
import Transfer from './core/Transfer';
import Configuration from './core/Configuration';
import TrackingHandler from './core/TrackingHandler';
import PageHandler from './core/PageHandler';
// import LocalstoreDB from './core/LocalstoreDB';
import ErrorCache from './core/ErrorCache';
import settings from '../lib/settings';

const errorCache = new ErrorCache();


window.addEventListener("unhandledrejection", event => {
  errorCache.add(event);
  console.warn(`UNHANDLED PROMISE REJECTION: `, event.reason, 
    '. Have you added the certificates by visiting the server page?');
});


async function load_blacklists(xbrowser) {
    // Loading blacklists
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

    return { 
      'specials':specials, 
      'filters': filters, 
      'simple': simple
    }

}


(async function main() {
  try {
    console.log('Start', new Date(), settings.server);
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
    var transfer = new Transfer(settings.server);
    window.pageHandler = null;

    let blacklists = await load_blacklists(window.xbrowser);

    window.config = new Configuration(settings, transfer, blacklists);
    config.onError = (err) => {
      throw err
    };

    let private_mode = config.defaultId.get()==null;

    console.log('Load Configuration');
    await config.load();    

    console.log('Create PageHandler');
    window.pageHandler = new PageHandler(config, transfer, window.tracker);
    // window.pageHandler.event.on('error', error => errorCache.add(error));

    let selected = config.getSelect();
    let tmp_settings = config.getRunProjectTmpSettings();
    if(selected!=null && tmp_settings && (tmp_settings.clientId != null 
        || !config.getProject(selected).SETTINGS.ENTERID)){
      window.pageHandler.selectProject(selected, private_mode);
    }

  } catch (e) {
    errorCache.add(e)
    console.warn(e);
  }
})();
