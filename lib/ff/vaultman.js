const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const Data = require("sdk/self").data, VaultURL = Data.url('vault.html');

/*
 * API:
 *  openVault()
 *  updateVault(ad) 
 *  updateVault() // re-layout
 *  closeVault()
 */
var VaultManager = require('sdk/core/heritage').Class({

    modified : false,
    
	worker : null,
    
    vaultTab : function() {
        
        return require("./adnutil").AdnUtil.findTab(VaultURL);
    },
    
    closeVault : function() {
        
        for (var tab of require("sdk/tabs")) {
            
            if (tab.url === VaultURL)
                tab.close();
        }
    },
 
    /*
     * Cases:
     *   vault-open-active
     *   vault-open-inactive
     *   vault-closed
     */
    onAdFound : function() {
        
        var tab = this.vaultTab();
        
        if (tab && this.worker) { // is vault open?
            
            if (tab === require('sdk/tabs').activeTab) { // active 
                
                console.log('onAdFound[active]: reload');    
                tab.reload(); // ok
            }
            else {                  // inactive 
                
                console.log('onAdFound[inactive]: sendLayout');
                this.modified = true;
            }
        }
        else {
            
            Logger.warn('Unexpected state(1): vault open with null worker!');
            this.closeVault(tab = null);
        }
        
    },
             
    /*
     * Cases:
     *   vault-open-active
     *   vault-open-inactive
     *   vault-closed
     */
    onAdVisit : function(ad) {
        
        console.log('onAdUpdate: '+ad);
        var tab = this.vaultTab();
        
        if (tab && ad) { // is vault open?

            if (this.worker) {
                    
                // send update
                this.worker.port.emit("update-ad", { update: ad }); 
            }
            else {
                
                Logger.warn('Unexpected state(2): vault open with null worker!');
                this.sendLayout()
            }
        }
    },
    
    openVault : function(tab) { // only called directly from main
        
        console.log('openVault: '+tab);
        
        var me = this, tab = tab || this.vaultTab();
        
        // vault is open and ready
        if (tab && this.worker) {
            
            console.log('activate/reload: '+tab);

            tab.activate();
            tab.reload();
            
            return;   
        }

        console.log('openTab: '+tab);

        require("sdk/tabs").open({
        
            url: VaultURL,
            
            onClose : function(tab) {
                
                this.worker = null;
            },
            
            onActivate : function(tab) { 
            
                console.log('vault-tab.onActivate()**** '+me.modified);    
                if (me.modified) {
                    
                    me.modified = false;
                    tab.reload();
                }
            },
            
            onReady : this.sendLayout.bind(this) 
        });
    },

    sendLayout : function(tab) {
        
        if (tab && tab.url === VaultURL) {
            
            this.worker = tab.attach({
                
                contentScriptFile : [
                
                    Data.url('lib/jquery-1.10.2.min.js'), 
                    Data.url('lib/packery.min.js'), 
                    Data.url('lib/imagesloaded.pkgd.min.js'), 
                    Data.url('lib/d3.min.js'), 
                    Data.url('adset.js'), 
                    Data.url('shared.js'),
                    Data.url("../lib/ff/adnutil.js"), 
                    Data.url('vault-ui.js'), 
                    Data.url('vault.js')
                ]
            });
            
            this.worker.port.on("close-vault", this.closeVault);
            
            this.worker.port.on("item-inspected", function(ad) { } );
                  
            // send layout message
            this.worker.port.emit("layout-ads", { 
                        
                data: require("./abpcomp").Component.parser.getAds()
            });    
        }
    }
});

exports.VaultManager = VaultManager();