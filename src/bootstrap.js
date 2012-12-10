function load(window) {
    if ( !window ) {
        return;
    }

    //////////////
    // API
    var browser, api;

    // Create namespace object to add methods to
    browser = window.getBrowser();
    if ( !browser ) {
        return;
    }
    // Expose API on browser object
    api = browser.importantTabs = {
        toggle: function() {
            var tab = browser.selectedTab;
            if ( tab.hasAttribute('important') ) {
                tab.removeAttribute('important');
                tab.style.color = '';
            } else {
                tab.setAttribute('important', true);
                tab.style.color = 'blue';
            }
        },
        forget: function() {
            var tabs = browser.visibleTabs;
            for (var i = tabs.length - 1; i >= 0; --i) {
                var tab = tabs[i];
                tab.removeAttribute('important');
                tab.style.color = '';
            }
        },
        close : function() {
            var tabs = browser.visibleTabs;
            for (var i = tabs.length - 1; i >= 0; --i) {
                if ( !tabs[i].hasAttribute('important') ) {
                    browser.removeTab(tabs[i]);
                }
            }
            api.forget();
        }
    };

    //////////////
    // Hotkeys
    var keyset, keys;

    keyset = window.document.getElementById('mainKeyset');
    if ( !keyset ) {
        return;
    }
    keys = {};

    // Toggle
    keys.toggle = window.document.createElement('key');
    keys.toggle.setAttribute('id', 'key_importantTabs_toggle');
    keys.toggle.setAttribute('key', ';');
    keys.toggle.setAttribute('modifiers', 'accel');
    keys.toggle.setAttribute('oncommand', 'gBrowser.importantTabs.toggle()');
    keyset.appendChild(keys.toggle);

    // Forget
    keys.close = window.document.createElement('key');
    keys.close.setAttribute('id', 'key_importantTabs_close');
    keys.close.setAttribute('key', "'");
    keys.close.setAttribute('modifiers', 'accel');
    keys.close.setAttribute('oncommand', 'gBrowser.importantTabs.close()');
    keyset.appendChild(keys.close);

    //////////////
    // UI
    var menu, anchor, ui;

    // Get the anchor for 'overlaying' but make sure the UI is loaded
    menu = window.document.getElementById('tabContextMenu');
    if (!menu) {
        return;
    }
    anchor = menu.querySelector('#context_closeOtherTabs');
    if ( !anchor || !(anchor = anchor.nextSibling) ) {
        return;
    }
    ui = {};

    // Separator
    ui.separator = window.document.createElement('menuseparator');
    ui.separator.setAttribute('id', 'context_importantTabs_separator');
    anchor.parentNode.insertBefore(ui.separator, anchor);

    // Toggle
    ui.toggle = window.document.createElement('menuitem');
    ui.toggle.setAttribute('id', 'context_importantTabs_toggle');
    ui.toggle.setAttribute('label', 'Important tab');
    ui.toggle.setAttribute('type', 'checkbox');
    ui.toggle.setAttribute('autocheck', 'false');
    ui.toggle.setAttribute('checked', 'false');
    ui.toggle.setAttribute('key', 'key_importantTabs_toggle');
    ui.toggle.addEventListener('command', browser.importantTabs.toggle);
    anchor.parentNode.insertBefore(ui.toggle, anchor);

    // Close all but important
    ui.close = window.document.createElement('menuitem');
    ui.close.setAttribute('id', 'context_importantTabs_close');
    ui.close.setAttribute('label', 'Close non-important tabs');
    ui.close.setAttribute('key', 'key_importantTabs_close');
    ui.close.addEventListener('command', browser.importantTabs.close);
    anchor.parentNode.insertBefore(ui.close, anchor);

    // Forget
    ui.forget = window.document.createElement('menuitem');
    ui.forget.setAttribute('id', 'context_importantTabs_forget');
    ui.forget.setAttribute('label', 'Forget importance');
    ui.forget.addEventListener('command', browser.importantTabs.forget);
    anchor.parentNode.insertBefore(ui.forget, anchor);

    //
    api.sync = function() {
        ui.toggle.setAttribute('checked', browser.selectedTab.hasAttribute('important') ? 'true' : 'false');
    };
    menu.addEventListener('popupshowing', api.sync);
}


function unload(window) {
    if ( !window ) {
        return;
    }

    // Remove context menu items
    ['separator', 'toggle', 'forget', 'close'].forEach(function(name) {
        var item = window.document.getElementById('context_importantTabs_' + name);
        if ( item ) {
            item.parentNode.removeChild(item);
        }
    });

    // Remove hot-keys
    ['toggle', 'forget', 'close'].forEach(function(name) {
        var key = window.document.getElementById('key_importantTabs_' + name);
        if ( key ) {
            key.parentNode.removeChild(item);
        }
    });

    // Remove exposed API methods
    var browser = window.getBrowser();
    if ( browser && browser.importantTabs ) {
        // Remove menu event listener
        var menu = window.document.getElementById('tabContextMenu');
        if (menu) {
            menu.removeEventListener('popupshowing', browser.importantTabs.sync);
        }
        // Remove API
        delete browser.importantTabs;
    }

}


/*
 bootstrap.js API
 */

var windowListener = {
    onOpenWindow       : function(aWindow) {
        // Wait for the window to finish loading
        var domWindow = aWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowInternal || Components.interfaces.nsIDOMWindow);
        domWindow.addEventListener('load', function() {
            domWindow.removeEventListener('load', arguments.callee, false);
            load(domWindow);
        }, false);
    },
    onCloseWindow      : function(aWindow) {
        var domWindow = aWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowInternal || Components.interfaces.nsIDOMWindow);
        domWindow.addEventListener('unload', function() {
            domWindow.removeEventListener('unload', arguments.callee, false);
            unload(domWindow);
        });
    },
    onWindowTitleChange: function(/*aWindow, aTitle*/) { }
};

function startup(/*aData, aReason*/) {
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);

    // Load into any existing windows
    var enumerator = wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
        var domWindow = enumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
        load(domWindow);
    }

    // Load into any new windows
    wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
    // When the application is shutting down we normally don't have to clean up any UI changes
    if ( aReason == APP_SHUTDOWN ) {
        return;
    }

    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);

    // Stop watching for new windows
    wm.removeListener(windowListener);

    // Unload from any existing windows
    var enumerator = wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
        var domWindow = enumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
        unload(domWindow);
    }
}

function install(/*aData, aReason*/) { }
function uninstall(/*aData, aReason*/) { }
