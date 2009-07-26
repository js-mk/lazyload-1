/**
 * LazyLoad makes it easy and painless to lazily load one or more external
 * JavaScript or CSS files on demand either during or after the rendering of
 * a web page.
 *
 * Supported browsers include Firefox 2, Firefox 3, IE 6 through 8, Safari 3 and
 * 4 (including iPhone), and Opera 9 and 10. Other browsers may or may not work
 * and are not officially supported.
 *
 * @module lazyload
 * @author Ryan Grove <ryan@wonko.com>
 * @copyright (c) 2009 Ryan Grove <ryan@wonko.com>. All rights reserved.
 * @license BSD License (http://www.opensource.org/licenses/bsd-license.html)
 * @url http://wonko.com/post/painless_javascript_lazy_loading_with_lazyload
 * @version 1.1.0
 */

/**
 * @class LazyLoad
 * @static
 */
LazyLoad = function () {

  // -- Private Variables ------------------------------------------------------

  // Shorthand reference to the browser's document object.
  var d = document,

  // Request currently in progress, if any.
  pending,

  // Array of queued requests (or groups of requests).
  queue = [],

  // Self-reference.
  self,

  // User agent information.
  ua;

  // -- Private Methods --------------------------------------------------------

  function createNode(name, attrs) {
    var node = d.createElement(name), attr;

    for (attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        node.setAttribute(attr, attrs[attr]);
      }
    }

    return node;
  }

  function finish(node) {
    if (!pending) { return; }

    var index = node.getAttribute('index');

    node.removeAttribute('index');
    pending.urls.splice(index, 1);

    // If this is the last of the pending URLs, execute the callback and
    // start the next request in the queue (if any).
    if (!pending.urls.length) {
      if (pending.callback) {
        if (pending.obj) {
          if (pending.scope) {
            pending.callback.call(pending.obj);
          } else {
            pending.callback.call(window, pending.obj);
          }
        } else {
          pending.callback.call();
        }
      }

      pending = null;

      if (queue.length) {
        load();
      }
    }
  }

  /**
   * Populates the <tt>ua</tt> variable with useragent information. Uses a
   * paraphrased version of the YUI useragent detection code.
   *
   * @method getUserAgent
   * @private
   */
  function getUserAgent() {
    // No need to run again if ua is already populated.
    if (ua) { return; }

    var nua = navigator.userAgent, m;

    ua = {
      gecko : 0,
      ie    : 0,
      webkit: 0
    };

    m = nua.match(/AppleWebKit\/(\S*)/);

    if (m && m[1]) {
      ua.webkit = parseFloat(m[1]);
    } else {
      m = nua.match(/MSIE\s([^;]*)/);

      if (m && m[1]) {
        ua.ie = parseFloat(m[1]);
      } else if ((/Gecko\/(\S*)/).test(nua)) {
        ua.gecko = 1;

        m = nua.match(/rv:([^\s\)]*)/);

        if (m && m[1]) {
          ua.gecko = parseFloat(m[1]);
        }
      }
    }
  }

  function load(type, urls, callback, obj, scope) {
    var head, i, len, node, set, url;

    // Determine browser type and version.
    getUserAgent();

    if (type && urls) {
      // Cast urls to an Array.
      urls = urls.constructor === Array ? urls : [urls];

      // Create a request object for each URL. If multiple URLs are specified,
      // the callback will only be executed after all URLs have been loaded.
      //
      // Unfortunately, in IE6 we can't load script requests in parallel because
      // we can't ensure execution order, so it gets "special" treatment.
      if (ua.ie && ua.ie < 7) {
        for (i = 0, len = urls.length; i < len; ++i) {
          queue.push({
            urls    : [urls[i]],
            callback: i === urls.length - 1 ? callback : null, // callback is only added to the last URL for IE6
            obj     : obj,
            scope   : scope,
            type    : type
          });
        }
      } else {
        queue.push({
          urls    : urls,
          callback: callback,
          obj     : obj,
          scope   : scope,
          type    : type
        });
      }
    }

    // If a previous load request is currently in progress, we'll wait our
    // turn. Otherwise, grab the next item in the queue.
    if (pending || !(pending = queue.shift())) {
      return;
    }

    head = d.getElementsByTagName('head')[0];

    for (i = 0, len = pending.urls.length; i < len; ++i) {
      url = pending.urls[i];

      if (type === 'css') {
        node = createNode('link', {
          href : url,
          index: i,
          rel  : 'stylesheet',
          type : 'text/css'
        });
      } else {
        node = createNode('script', {
          index: i,
          src  : url
        });
      }

      if (ua.ie) {
        node.onreadystatechange = function () {
          var readyState = this.readyState;

          if (readyState === 'loaded' || readyState === 'complete') {
            node.onreadystatechange = null;
            finish(node);
          }
        };
      } else {
        node.onload = node.onerror = function () { finish(node); };
      }

      head.appendChild(node);

      // Gecko and WebKit don't support the onload event on link nodes, so we
      // just have to finish immediately and hope for the best.
      if (type === 'css' && (ua.gecko || ua.webkit)) {
        finish(node);
      }
    }
  }

  self = {
    css: function (urls, callback, obj, scope) {
      load('css', urls, callback, obj, scope);
    },

    js: function (urls, callback, obj, scope) {
      load('js', urls, callback, obj, scope);
    }
  };

  return self;
}();
