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
  console.warn(`UNHANDLED PROMISE REJECTION: `, event.reason);
});


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

    window.config = new Configuration(settings, transfer);
    config.onError = (err) => {
      throw err
    };
    await config.load();
    console.log('<Config load>');

    window.pageHandler = new PageHandler(config, transfer, window.tracker);
    // window.pageHandler.event.on('error', error => errorCache.add(error));

    if(config.getSelect()!=null && config.getRunProjectTmpSettings() && (config.getRunProjectTmpSettings().clientId != null || !config.getProject(config.getSelect()).SETTINGS.ENTERID)){
      window.pageHandler.selectProject(config.getSelect());
    }



  } catch (e) {
    errorCache.add(e)
    console.warn(e);
  }
})();
