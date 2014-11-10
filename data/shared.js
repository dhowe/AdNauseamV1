
// functions shared between various views

function showAlert(msg) {
    
    if (msg) {
        
        $("#alert").removeClass('hide');
        $("#alert p").text(msg);
    }
    else {
        
        $("#alert").addClass('hide');
    }
}

function processAdData(adhash, pageUrl) {

    var ads = toAdArray(adhash);

//console.warn("processAdData: "+ads.length+", "+pageUrl);

    var ad, unique=0, onpage=[], soFar, hash = {};

    // set hidden val for each ad
    for (var i=0, j = ads.length; i<j; i++) {

        ad = ads[i];

        if (!ad.contentData) continue;

        soFar = hash[ad.contentData];
        if (!soFar) {

            // new: add a hash entry
            hash[ad.contentData] = 1;
            ad.hidden = false;

            // update count on this page
            if (pageUrl === ads[i].pageUrl ||
                (typeof testPageUrl != 'undefined' &&
                    testPageUrl === ads[i].pageUrl))  // for testing
            {
                // TODO: don't count old ads from same url
                onpage.push(ads[i]);
            }

            // update total (unique) count
            unique++;
        }
        else {

            // dup: update the count
            hash[ad.contentData]++;
            ad.hidden = true;
        }
    }

    // update the count for each ad from hash
    for (var i=0, j = ads.length; i<j; i++) {

        ad = ads[i];
        ad.count = hash[ad.contentData];
    }

    return { ads: ads, onpage: onpage, unique: unique };
}


function toAdArray(adhash, filter) { 

    var all = [], keys = Object.keys(adhash);
    for (var i = 0, j = keys.length; i < j; i++) {

        var ads = adhash[keys[i]];
        for (var k=0; k < ads.length; k++) {

            if (!filter || filter(ads[k]))
                all.push(ads[k]);
        }
    }

    return all;
}
