const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const Data = require("sdk/self").data, VaultURL = Data.url('vault.html');

var VaultManager = require('sdk/core/heritage').Class({

	worker : null,

    tabForUrl : function(url) {
        
        for (var tab of require("sdk/tabs")) {
            
            if (tab.url === url)
                return tab;
        }
        
        return null;
    },
    
    closeVault : function() {
        
        var tab = this.tabForUrl(VaultURL);
        tab && tab.close();
    },
       
    updateVault : function(ad) {
        
        if (!this.tabForUrl(VaultURL)) return; // no vault 
    
        if (this.worker) {
                
                var fun = ad ? this.sendUpdate : this.sendLayout;
                fun.call(this, ad); 
        }
        else {
            
            Logger.warn('Unexpected state: vault open with null worker!');
            this.openVault();
        }
    },
    
    openVault : function() {
        
        var me = this, vaultTab = this.tabForUrl(VaultURL);
        
        // vault is open and ready
        if (vaultTab && this.worker) {

            console.log("VAULT-WORKER: activating");
            vaultTab.activate();
            return;   
        }

        require("sdk/tabs").open({
        
            url: VaultURL,
            
            onClose : function(tab) {
                
                me.worker = null;
            },
            
            onActivate : function(tab) {
                
                console.log("VAULT-WORKER: onActivate");
            },
            
            onReady : function(tab) {
                
                console.log("VAULT-WORKER: onReady");
                
                me.worker = tab.attach({
                    
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
                
                me.worker.port.on("close-vault", require('sdk/tabs').activeTab.close) // from vault.js
                    
                me.sendLayout();            
            } 
        });
    },
    
    sendUpdate : function(ad) {
        
        this.worker.port.emit("update-ad", { 
                    
            update: ad
        });    
    },
    
    sendLayout : function() {
        
        this.worker.port.emit("layout-ads", { 
                    
            data: require("../ff/abpcomp").Component.parser.adArray()
        });    
    }
});

exports.VaultManager = VaultManager();