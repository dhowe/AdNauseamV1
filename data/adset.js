var TEXT_MINW = 150, TEXT_MAXW = 450;

function createAdSets(ads) {

    var ad, hash = {}, adsets = [];

    // set hidden val for each ad
    for (var i=0, j = ads.length; i<j; i++) {

        ad = ads[i];
        
        key = computeHashKey(ad); 
        
        if (!key) {
            
            console.log("*** adset.js::ignore->no key!!!", ad);
            continue;
        }
        
        if (!hash[key]) {

            // new: add a hash entry
            hash[key] = new AdSet(ad);
            adsets.push(hash[key]);
        }
        else {

            // dup: update the count
            hash[key].add(ad);
        }
    }

    return adsets;
}

function computeHashKey(ad) { // dup in shared.js
    
    // a backwards-compatible hash-key 
    
    if (ad.hashKey) return ad.hashKey; // if we have one, use it
    
    var res = ad.contentData.src || ad.contentData; // otherwise, use what we can
    
    console.warn("[WARN] Deprecated hashKey found for ad#"+ad.id+"\n\t\t"+res);
    
    return res;
}

function AdSet(ad) { 

    this.gid = Math.abs(createGid(ad));
    this.ts = +new Date();
    //console.log('create AdSet#'+this.gid);
    this.children = [];
    this.index = 0;
    this.add(ad);
}

AdSet.prototype.id = function(i) {
    
    return this.child(i).id;
}

AdSet.prototype.findChildById = function(id) {
    
    for (var i=0, j = this.children.length; i<j; i++) {
        
      if (this.children[i].id === id)
        return i;
    }

    return -1;
}

AdSet.prototype.child = function(i) {
    
    return this.children[(typeof i == 'undefined') ? this.index : i];
}

AdSet.prototype.state = function(i) {
    
    var visitedTs = this.child(i).visitedTs;
    return (visitedTs == 0) ? 'pending' :
        (visitedTs  < 0 ? 'failed' : 'visited' );
}

AdSet.prototype.type = function() {
    
    return this.children[0].contentType; // same-for-all
}

AdSet.prototype.failedCount = function() {
    
    return this.children.filter(function(d) {
        return d.visitedTs < 0;
    }).length;
}

AdSet.prototype.visitedCount = function() {
    
    return this.children.filter(function(d) {
        return d.visitedTs > 0;
    }).length;
}

AdSet.prototype.count = function() {
    
    return this.children.length;
}
    
AdSet.prototype.add = function(ad) {
    
     ad && this.children.push(ad);
}

function createGid(ad) {
    
    var hash = 0;
    for (var i = 0; i < ad.hashKey.length; i++) {
        var code = ad.hashKey.charCodeAt(i);
        hash = ((hash<<5)-hash) + code;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

/*
 * returns 'visited' if any are visited,
 *      'failed' if all are failed or pending,
 *      'pending' if all are pending.
 */
AdSet.prototype.groupState = function() {
    
    var failed, visited = this.visitedCount();
    
    if (visited) return 'visited';
    
    failed = this.failedCount();

    return failed ? 'failed' : 'pending';
}


//AdSet.createAdSets = createAdSets;
//(typeof exports != 'undefined') && (exports.AdSet = AdSet);

