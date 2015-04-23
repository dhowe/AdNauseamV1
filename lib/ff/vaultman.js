const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const Data = require("sdk/self").data, VaultURL = Data.url('vault.html');

var VaultManager = require('sdk/core/heritage').Class({

	worker : null,
    inspected : null,
	modified : false,
    
    vaultTab : function() {
        
        return require("./adnutil").AdnUtil.findTab(VaultURL);
    },
    
    closeVault : function() {
        
        for (var tab of require("sdk/tabs")) {
            
            if (tab.url === VaultURL)
                tab.close();
        }
    },
    
    onAdAttempt : function(ad) {
        
        var tab = this.vaultTab();
        
        if (tab && this.worker) { // is vault open?
            
            if (tab === require('sdk/tabs').activeTab) { // active 
                
                //console.log('vaultman::onAdAttempt()');    
                this.worker.port.emit("set-current", { current: ad }); 
            }
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
        
        if (tab) {
            
            if (this.worker) { // is vault open?
            
                if (tab === require('sdk/tabs').activeTab) { // active 
                        
                    tab.reload();
                }
                else {    // inactive 
                    
                    //console.log('onAdFound[inactive]: sendLayout');
                    this.modified = true;
                }
            }
            else {
                
                require("./logger").Logger.warn
                    ('Unexpected state(1): vault open with null worker!');
                    
                this.closeVault(tab = null);
            }
        }
    },
             
    /*
     * Cases:
     *   vault-open-active
     *   vault-open-inactive
     *   vault-closed
     */
    onAdVisit : function(ad) {
        
        //console.log('onAdUpdate: ',ad);
        
        var tab = this.vaultTab();
        
        if (tab && ad) { // is vault open?

            if (this.worker) {
                    
                // send update
                this.worker.port.emit("update-ad", { update: ad, current: null, }); 
            }
            else {
                
                require("./logger").Logger.warn('Unexpected state(2): vault open with null worker!');
                this.sendLayout();
            }
        }
    },
    
    openVault : function(tab) { // only called directly from main
        
        //console.log('openVault: '+tab);
        
        var me = this;
        
        tab = tab || this.vaultTab();
        
        // vault is open and ready
        if (tab && this.worker) {
            
            tab.activate();
            tab.reload();
            
            return;   
        }

        require("sdk/tabs").open({
        
            url: VaultURL,
            
            onClose : function(tab) {
                
                this.worker = null;
            },
            
            onActivate : function(tab) { 
            
                //console.log('vault-tab.onActivate()**** '+me.modified);
                    
                if (me.modified) {
                    
                    me.modified = false;
                    tab.reload();
                }
            },
            
            onReady : this.sendLayout.bind(this) 
        });
    },
    
    sendLayout : function(tab) {
        
        var parser = require("./abpcomp").Component.parser;
        
        if (tab && tab.url === VaultURL) {
            
            this.worker = tab.attach({
                
                contentScriptFile : [
                
                    Data.url('lib/jquery-1.11.2.min.js'), 
                    Data.url('lib/packery.min.js'), 
                    Data.url('lib/imagesloaded.pkgd.min.js'), 
                    Data.url('lib/d3.min.js'), 
                    Data.url('adset.js'), 
                    Data.url('shared.js'),
                    Data.url("../lib/ff/adnutil.js"), 
                    Data.url('vault-slider.js'), 
                    Data.url('vault.js')
                ]
            });
            
            this.worker.port.on("close-vault", this.closeVault);
            
            this.worker.port.on("delete-adset", function(json) {

                require("./adnutil").AdnUtil.log("delete-adset: ", json);
                
                if (json.ids) {
                    
                    require("./adnutil").AdnUtil.log("delete-adset-ids ", json.ids);
                    
                    for (var i=0,len=json.ids.length; i<len; i++) {
                    
                        if (!parser.deleteAd(json.ids[i])) {
                        
                            require("./logger").Logger.warn
                                ('Unexpected state(3): could not delete ad#'+json.ids[i]);
                        }
                        
                        require("./adnutil").AdnUtil.log("deleted-id:"+json.ids[i]);
                    }
                }
            });            
            
            this.worker.port.on("item-inspected", function(json) {
                
                if (json.id) {
                    
                    var ad = parser.findById(json.id);
                    
                    if (ad.visitedTs === 0) {
                        
                        //console.log("Parser::lightbox: ad#"+ad.id);
                        this.inspected = ad;
                    }
                }
            });

            // send layout message
			var locale = require("sdk/l10n").get;
            this.worker.port.emit("layout-ads", { 
                        
                data: parser.getAds(),
                current: parser.visitor.currentAd,
				
				mon: locale("adn.vault.mon"),
				tue: locale("adn.vault.tue"),
				wed: locale("adn.vault.wed"),
				thu: locale("adn.vault.thu"),
				fri: locale("adn.vault.fri"),
				
				sat: locale("adn.vault.sat"),
				sun: locale("adn.vault.sun"),
				
				jan: locale("adn.vault.jan"),
				feb: locale("adn.vault.feb"),
				mar: locale("adn.vault.mar"),
				apr: locale("adn.vault.apr"),
				may: locale("adn.vault.may"),
				jun: locale("adn.vault.jun"),
				jul: locale("adn.vault.jul"),
				aug: locale("adn.vault.aug"),
				sep: locale("adn.vault.sep"),
				oct: locale("adn.vault.oct"),
				nov: locale("adn.vault.nov"),
				dec: locale("adn.vault.dec"),
				
				am: locale("adn.vault.am"),
				pm: locale("adn.vault.pm"),
				
				ad: locale("adn.vault.inspector.ad"),
				target: locale("adn.vault.inspector.target"),
				detectedOn: locale("adn.vault.inspector.detectedOn"),
				
				notYetVisited: locale("adn.vault.notYetVisited"),
				unableToVist: locale("adn.vault.unableToVisit") 
				
            });    
        }
    }
});

exports.VaultManager = VaultManager();