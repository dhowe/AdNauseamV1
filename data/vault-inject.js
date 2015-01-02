self.port && self.port.on('layout-ads', layoutAds); // refresh all
self.port && self.port.on('update-ad', updateAds); // update some

function layoutAds(json) {

    var adArray = json.data;
    
    window.adSets = createAdSets(adArray); 
    
log('Vault.layoutAds: '+adSets.length+" "+ window);
LOG_ADSET('LA');

    addInterfaceHandlers();
    
    createSlider(adArray);

    doLayout(adSets, true);

    //tagCurrentAd(addonData.currentAd);    
}


// CHANGED(12/19): Each ad is now visited separately
function updateAds(addonData) {

    log('Vault.updateAds() :: ' + window);
    
    var adArray = json.data;
    
    adSets = createAdSets(adArray);
    
    //log('Vault.updateAds() - OriginalState: '+adSets[0].groupState());
    //log(addonData.data,'\n\n',adSets,'\n\n', addonData.update);
    LOG_ADSET('UA');

return;
         
    // update class/title/visited/resolved-url
    doUpdate(json.update);

    //tagCurrentAd(addonData.currentAd);
    
    computeStats(adSets);
}