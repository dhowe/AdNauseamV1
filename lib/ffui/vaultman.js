const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const Data = require("sdk/self").data, VaultURL = Data.url('vault.html');

/*
 * API:
 *  openVault()
 *  updateVault(ad) 
 *  updateVault() // re-layout
 *  closeVault
 * 
 */
var VaultManager = require('sdk/core/heritage').Class({

	worker : null,
    
    vaultTab : function() {
        
        var vtab;
        
        for (var tab of require("sdk/tabs")) {
            
            if (tab.url === VaultURL) {
                
                if (vtab) 
                    throw Error('Invalid state: multiple vaults open');
                    
                vtab = tab
            }
        }
              
        return vtab;
    },
    
    closeVault : function() {
        
        for (var tab of require("sdk/tabs")) {
            
            if (tab.url === VaultURL)
                tab.close();
        }
    },
       
    updateVault : function(ad) {
        
        var tab = this.vaultTab();
        
        if (tab) { // is vault open?

            if (this.worker) {
                    
                if (ad)  // send update
                    this.worker.port.emit("update-ad", { update: ad }); 
                    
                else    // activate our tab
                    this.openVault(tab);
            }
            else {
                
                Logger.warn('Unexpected state: vault open with null worker!');
                this.openVault(tab);
            }
        }
    },
    
    openVault : function(tab) {
        
        var me = this, tab = tab || this.vaultTab();
        
        // vault is open and ready
        if (tab && this.worker) {

            console.log("VAULT-WORKER: activate/reload");
            
            tab.activate();
            tab.reload();
            
            return;   
        }

        require("sdk/tabs").open({
        
            url: VaultURL,
            
            onClose : function(tab) {
                
                this.worker = null;
            },
            
            onActivate : function(tab) { },
            
            onReady : this.sendLayout.bind(this) 
        });
    },

    sendLayout : function(tab) {
        
        if (tab && tab.url === VaultURL) {
         
            console.log("VAULT-WORKER: onReady");
            
            this.worker = tab.attach({
                
                contentScriptFile : [
                
                    Data.url('lib/jquery-1.10.2.min.js'), 
                    Data.url('lib/packery.min.js'), 
                    Data.url('lib/imagesloaded.pkgd.min.js'), 
                    Data.url('lib/d3.min.js'), 
                    Data.url('adset.js'), 
                    Data.url('shared.js'), 
                    Data.url('vault-ui.js'), 
                    Data.url('vault.js')
                ]
            });
            
            this.worker.port.on("close-vault", this.closeVault);
            
            this.worker.port.on("item-inspected", function(ad) { } );
                  
            // send layout message
            this.worker.port.emit("layout-ads", { 
                        
                data: require("../ff/abpcomp").Component.parser.adArray()
            });    
        }
    }
});

exports.VaultManager = VaultManager();