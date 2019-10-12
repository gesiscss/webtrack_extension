
 export default class DomDetector {

   constructor() {
     this.last = +new Date();
     this.delay = 100;
     this.stack = [];
     this._decide = this._decide.bind(this);
     this._callback = this._callback.bind(this);
     this.support = {};
     this.remain = 3;

     // attach test events
     if (window.addEventListener) {
         this._test('DOMSubtreeModified');
         this._test('DOMNodeInserted');
         this._test('DOMNodeRemoved');
     } else {
         this._decide();
     }

     this.current_hash = window.location.hash;
     this.createLocationChangeEvent();

     var dummy = document.createElement("div");
     this._getElement().appendChild(dummy);
     this._getElement().removeChild(dummy);
   }

   /**
    * [ create locationchange to window ]
    */
   createLocationChangeEvent(){

     history.pushState = ( f => function pushState(){
        var ret = f.apply(this, arguments);
        window.dispatchEvent(new Event('pushState'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
      })(history.pushState);

      history.replaceState = ( f => function replaceState(){
        var ret = f.apply(this, arguments);
        window.dispatchEvent(new Event('replaceState'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
      })(history.replaceState);

      window.addEventListener('popstate', (ev) => {
        if (ev.target.location.hash == this.current_hash){
          window.dispatchEvent(new Event('locationchange'));
        } else {
          this.current_hash = ev.target.location.hash;
        }
      });

      window.addEventListener('locationchange', function(event){
        console.log('location changed!');
      })
   }

   /**
    * [return the documentElement]
    * @return {Object}
    */
   _getElement(){
     return document.documentElement;
   }


   /**
    * [call all function on the stack]
    */
   _callback(){
     let now = +new Date();
     if (now - this.last > this.delay) {
         this.last = now;
         for (let i = 0; i < this.stack.length; i++) {
             this.stack[i]();
         }

     }
   }

   removeAllEventListener(){
    this.stack = [];
   }

   /**
    * [append function to the stack]
    * @param  {Function} fn
    * @param  {Number}   [newdelay=this.delay]
    */
   onChange(fn, newdelay=this.delay){
     this.delay = newdelay;
     this.stack.push(fn);
   }


   _naive(){
     var last = document.getElementsByTagName('*');
     var lastlen = last.length;
     var timer = setTimeout(function check() {

         // get current state of the document
         let current = document.getElementsByTagName('*');
         let len = current.length;

         // if the length is different
         // it's fairly obvious
         if (len != lastlen) {
             // just make sure the loop finishes early
             last = [];
         }

         // go check every element in order
         for (var i = 0; i < len; i++) {
             if (current[i] !== last[i]) {
                 this._callback();
                 last = current;
                 lastlen = len;
                 break;
             }
         }

         // over, and over, and over again
         setTimeout(check, this.delay);

     }.bind(this), this.delay);
   }

   // callback for the tests
   _decide(){
     if (this.support.DOMNodeInserted) {
         if (this.support.DOMSubtreeModified) { // for FF 3+, Chrome
             this._getElement().addEventListener('DOMSubtreeModified', this._callback, false);
         } else { // for FF 2, Safari, Opera 9.6+
             this._getElement().addEventListener('DOMNodeInserted', this._callback, false);
             this._getElement().addEventListener('DOMNodeRemoved', this._callback, false);
         }
     } else if (document.onpropertychange) { // for IE 5.5+
         document.onpropertychange = this._callback;
     } else { // fallback
         this._naive();
     }
   }

   // checks a particular event
   _test(event){
      this._getElement().addEventListener(event, function fn() {
         this.support[event] = true;
         this._getElement().removeEventListener(event, fn, false);
         if (--this.remain === 0) this._decide();
     }.bind(this), false);
   }


 }//class
