/*jslint browser: true*/

/*global
    gAds: true, gAdSets: true, self, createSlider, log, warn, targetDomain, alert,
    rand, error, Type, AdSet, byField, showAlert, Packery, computeHashKey, toAdArray,
    TEXT_MINW, TEXT_MAXW, TEST_APPEND_IDS, TEST_ADS, TEST_MODE, TEST_PAGE
*/

const LogoURL = 'http://dhowe.github.io/AdNauseam/',
    States = ['pending', 'visited', 'failed'],
    Zooms = [100, 50, 25, 12.5, 6.25],
    EnableContextMenu = 1,
    MaxPerSet = 9;

var zoomStyle, zoomIdx = 0,
    animatorId, animateMs = 2000,
    resizeId, selectedAdSet,
    viewState = {
        zoomIdx: 0,
        left: '-5000px',
        top: '-5000px'
    };

var locale = self.options.locale;
console.log(locale);

/*
    TODO: on first-run, doImport() on all ads in storage
*/

self.port && self.port.on('layout-ads', layoutAds); // refresh all
self.port && self.port.on('update-ad', updateAd); // update some
self.port && self.port.on('set-current', setCurrent); // ad attempt

function layoutAds(json) {

    log('vault.js::layoutAds');

    gAds = json.data; // store

    addInterfaceHandlers();

    gAdSets = createSlider();

    setCurrent(json);
}

function updateAd(json) {

    // update class/title/visited/resolved-url
    doUpdate(json.update);

    setCurrent(json);

    computeStats(gAdSets);
}

function setCurrent(json) {

    if (1) return; // TODO: Disabled pending resolution of #151

    //log('vault::setCurrent: '+(json.current?json.current.id:-1));

    $('.item').removeClass('attempting');

    if (json.current) {

        var groupInfo = findAdById(json.current.id),
            $item;

        if (groupInfo) {

            $item = findItemDivByGid(groupInfo.group.gid);

            // update the class for ad being attempted
            $item && $item.addClass('attempting');
        }

    }
}

function doLayout(adsets) {

    //log('Vault.doLayout: '+adsets.length +" ad-sets");

    if (!adsets) throw Error("No ads!");

    $('.item').remove();

    createDivs(adsets);

    computeStats(adsets);

    enableLightbox();

    repack();
}

function createDivs(adsets) {

    function hoverOnDiv(e) { // on

        var $this = $(this);

        if ($this.hasClass('inspected')) {


            // pause animation on mouse-over image
            var inspectedGid = parseInt($this.attr('data-gid'));
            selectedAdSet = findAdSetByGid(inspectedGid); // throws
            bulletIndex($this, selectedAdSet);
            animateInspector(false);
        }

        e.stopPropagation();
    }

    function hoverOffDiv(e) { // off

        if ($(this).hasClass('inspected')) {

            animateInspector($(this));
        }
    }

    for (var i = 0; i < adsets.length; i++) {

        var $div = $('<div/>', {

                'class': 'item dup-count-' + adsets[i].count(),
                'data-gid': adsets[i].gid

            }).appendTo('#container');

        layoutAd($div, adsets[i]);

        $div.hover(hoverOnDiv, hoverOffDiv);
    }
}

function layoutAd($div, adset) {

    // append the display
    (adset.child(0).contentType === 'text' ?
        appendTextDisplayTo : appendDisplayTo)($div, adset);

    appendBulletsTo($div, adset);
    appendMetaTo($div, adset);

    var state = adset.groupState();
    //log('setGroupState: '+$div.length,state);
    setItemClass($div, state);
}

function doUpdate(updated) {

    var groupInfo = findAdById(updated.id),
        adset, itemClass, $item;

    if (groupInfo) {

        adset = groupInfo.group;
        $item = findItemDivByGid(groupInfo.group.gid);

        // update the adgroup
        adset.index = groupInfo.index;
        adset.children[adset.index] = updated;
    }

    if (!$item) {

        log("Item (adset=" + adset.gid + ") not currently visible");
        return;
    }

    // update the ad data
    updateMetaTarget($item.find('.target[data-idx=' + adset.index + ']'), updated);

    // update the class (just-visited)
    itemClass = updated.visitedTs > 0 ? 'just-visited' : 'just-failed';
    $item.addClass(itemClass).siblings()
        .removeClass('just-visited')
        .removeClass('just-failed');

    setItemClass($item, adset.groupState());

    (adset.count() > 1) && bulletIndex($item, adset);
}

function setItemClass($item, state) {

    States.map(function(d) {
            $item.removeClass(d);
        }); // remove-all
    $item.addClass(state);
}

function appendMetaTo($div, adset) {

    var $meta = $('<div/>', {
            class: 'meta'
        }).appendTo($div);

    var $ul = $('<ul/>', {

            class: 'meta-list',
            style: 'margin-top: 0px'

        }).appendTo($meta);

    for (var i = 0; i < adset.count(); i++) {

        var ad = adset.child(i);

        var $li = $('<li/>', {

                'class': 'meta-item',
                'style': 'margin-top: 0px'

            }).appendTo($ul);

        var $target = $('<div/>', {

                class: 'target',
                'data-idx': i

            }).appendTo($li);

        appendTargetTo($target, ad, adset); // tmp, remove adset

        var $detected = $('<div/>', {
                class: 'detected-on'
            }).appendTo($li);
        appendDetectedTo($detected, ad);
    }
}

function appendDetectedTo($detected, ad) {

    $('<h3/>', {
            text: 'detected on:'
        }).appendTo($detected);

    $('<a/>', {
            class: 'inspected-title',
            href: ad.pageUrl,
            text: ad.pageTitle,
            target: '_blank'

        }).appendTo($detected);

    $('<cite/>', {
            text: ad.pageUrl
        }).appendTo($detected);

    $('<span/>', {

            class: 'inspected-date',
            text: formatDate(ad.foundTs)

        }).appendTo($detected);
}

function appendTargetTo($target, ad, adset) {

    $('<h3/>', {
            text: 'target:'
        }).appendTo($target);

    //log("Creating target #"+ad.id+" title="+ad.title);
    $('<a/>', {

            id: 'target-title',
            class: 'inspected-title',
            href: ad.targetUrl,
            text: ad.title,
            target: '_blank'

        }).appendTo($target);

    $('<cite/>', {

            id: 'target-domain',
            class: 'target-cite',
            text: targetDomain(ad)

        }).appendTo($target);

    $('<span/>', {

            id: 'target-date',
            class: 'inspected-date',
            text: formatDate(ad.visitedTs)

        }).appendTo($target);
}

function updateMetaTarget($target, ad) {

    //log("*** updateMetaTarget:"+$target.length);

    $target.find('#target-domain').text(targetDomain(ad));
    $target.find('#target-date').text(formatDate(ad.visitedTs));
    var $titleA = $target.find('#target-title').text(ad.title);
    if (ad.resolvedTargetUrl)
        $titleA.attr('href', ad.resolvedTargetUrl);
}

/**
 * Resets current bullet class to [active,ad.state]
 * Shifts meta list to show correct item
 * Updates index-counter for the bullet
 */
function bulletIndex($div, adset) { // adset.index must be updated first

    var $bullet = $div.find('.bullet[data-idx=' + (adset.index) + ']'),
        state = adset.state(),
        $ul;

    //log('bulletIndex: c["+adset.index+"]="+adset.child().id+"-> "+ adset.state());

    // set the state for the bullet
    setItemClass($bullet, state);

    // set the active class for bullet
    $bullet.addClass('active')
        .siblings().removeClass('active');

    // shift the meta-list to show correct info
    $ul = $div.find('.meta-list');
    $ul.css('margin-top', (adset.index * -110) + 'px');

    // update the counter bubble
    $div.find('#index-counter').text(indexCounterText(adset));

    if ($div.hasClass('inspected')) {

        // (temporarily) add the state-class to the div
        setItemClass($div, state);
    }
}

function appendDisplayTo($div, adset) {

    var $ad = $('<div/>', {
            class: 'ad'
        }).appendTo($div);
    var total = adset.count();

    var $span = $('<span/>', {

            class: 'counter',
            text: total

        }).appendTo($ad);

    var $cv = $('<span/>', {

            id: 'index-counter',
            class: 'counter counter-index',
            text: indexCounterText(adset)

        }).appendTo($ad).hide();

    var img = $('<img/>', {

            src: adset.child(0).contentData.src,

            onerror: "this.onerror=null; this.width=80; this.height=40; " + "this.alt='unable to load image'; this.src='img/placeholder.svg'",

        }).appendTo($ad);
}

function appendTextDisplayTo($pdiv, adset) {

    var total = adset.count(),
        ad = adset.child(0);

    $pdiv.addClass('item-text');

    var $div = $('<div/>', {

            class: 'item-text-div',
            width: rand(TEXT_MINW, TEXT_MAXW)

        }).appendTo($pdiv);

    var $span = $('<span/>', {

            class: 'counter',
            text: total

        }).appendTo($div);

    var $cv = $('<span/>', {

            id: 'index-counter',
            class: 'counter counter-index',
            text: indexCounterText(adset)

        }).appendTo($div).hide();

    var $h3 = $('<h3/>', {}).appendTo($div);

    $('<div/>', { // title

            class: 'title',
            text: ad.title,
            target: '_blank'

        }).appendTo($h3);

    $('<cite/>', {
            text: ad.contentData.site
        }).appendTo($div); // site

    $('<div/>', { // text

            class: 'ads-creative',
            text: ad.contentData.text

        }).appendTo($div);
}

function indexCounterText(adset) {

    return (adset.index + 1) + '/' + adset.count();
}

function appendBulletsTo($div, adset) {

    function hoverOnLi(e) { // on

        e.stopPropagation();

        adset.index = parseInt($(this).attr('data-idx'));
        bulletIndex($div, adset);

        animateInspector(false);
    }

    function hoverOffLi(e) { // off

        animateInspector($div);
    }

    var count = adset.count();

    if (count > 1) {

        var $bullets = $('<div/>', {
                class: 'bullets'
            }).appendTo($div),
            $ul = $('<ul/>', {}).appendTo($bullets);

        // add items based on count/state
        for (var i = 0; i < adset.count(); i++) {

            var $li = $('<li/>', {

                    'data-idx': i,
                    'class': 'bullet ' + adset.state(i)

                }).appendTo($ul);

            $li.hover(hoverOnLi, hoverOffLi);
        }
    }
}

function computeStats(adsets) {

    $('.since').text(sinceTime(adsets));
    $('.clicked').text(numVisited(adsets) + ' ads clicked');
    $('.detected').text(numFound(adsets) + ' detected');
}

function numVisited(adsets) {

    var numv = 0;
    for (var i = 0, j = adsets.length; i < j; i++)
        numv += (adsets[i].visitedCount());
    return numv;
}

function numFound(adsets) {

    var numv = 0;
    for (var i = 0, j = adsets.length; i < j; i++)
        numv += (adsets[i].count());
    return numv;
}

function sinceTime(adsets) {

    var oldest = +new Date(),
        idx = 0;
    for (var i = 0, j = adsets.length; i < j; i++) {

        var foundTs = adsets[i].child(0).foundTs;
        if (foundTs < oldest) {

            oldest = foundTs;
            idx = i;
        }
    }

    return formatDate(oldest);
}

function dragStart(e) {

    var style = window.getComputedStyle(document.querySelector('#container'), null),
        x = parseInt(style.getPropertyValue("margin-left"), 10) - e.clientX,
        y = parseInt(style.getPropertyValue("margin-top"), 10) - e.clientY;

    e.dataTransfer.setData("text/plain", x + ',' + y);

    $('#container').addClass('dragged');
}

function dragOver(e) {

    var offset = e.dataTransfer.getData("text/plain").split(','),
        dm = document.querySelector('#container');

    dm.style.marginLeft = (e.clientX + parseInt(offset[0], 10)) + 'px';
    dm.style.marginTop = (e.clientY + parseInt(offset[1], 10)) + 'px';
}

function dragEnd(e) {

    $('#container').removeClass('dragged');
}

function formatDate(ts) {

    if (!ts) return 'Not Yet Visited';

    var date = new Date(Math.abs(ts)),
        days = ["Sunday", "Monday",
            "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
        ],
        months = ["January", "February", "March", "April", "May",
            "June", "July", "August", "September", "October",
            "November", "December"
        ];

    var pad = function(str) {

        var s = String(str);
        return (s.length < 2) ? "0" + s : s;
    };

    var meridian = (parseInt(date.getHours() / 12) == 1) ? 'PM' : 'AM';
    var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();

    return days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate() +
        ' ' + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes()) +
        meridian.toLowerCase();
}

function enableLightbox() {

    $('.item').click(function(e) {

            e.stopPropagation();
            lightboxMode(this);
        });

    if (EnableContextMenu) {

        $('.item').bind("contextmenu", function(e) {

                e.stopPropagation();

                var inspectedGid = parseInt( $(this).attr('data-gid') );
                selectedAdSet = findAdSetByGid(inspectedGid); // throws

                // Avoid the real one
                e.preventDefault();

                // Show contextmenu
                $(".custom-menu").finish().toggle(100).

                // In the right position (the mouse)
                css({
                        top: (e.pageY-25) + "px",
                        left: e.pageX + "px"
                    });
            });
    }
}

function positionAds(items) { // autozoom

    //log('positionAds() :: '+items.length);

    setZoom(zoomIdx = 0, true); // Q: start with previous zoom or 100%?

    var i = 0,
        percentVis = 0.6,
        winW = $(window).width(),
        winH = $('#svgcon').offset().top;

    while (i < items.length) {

        var $this = $(items[i++]),
            scale = Zooms[zoomIdx] / 100;

        if (!onscreen($this, winW, winH, scale, percentVis)) {

            log("Too-large @ " + Zooms[zoomIdx] + "%");
            setZoom(++zoomIdx, true);

            if (zoomIdx == Zooms.length - 1)
                break; // at smallest size, done

            i = 0;
            continue; // else try next smaller
        }
    }

    // OK at current size, done
}

function storeItemLayout($items) {

    //log('storeItemLayout()');

    var cx = $(window).width() / 2,
        cy = $(window).height() / 2;

    if (!$items) throw Error('No items!');

    $items.each(function(i) {

            var $this = $(this),
                off = $this.offset();

            // offsets of item-corner from window center
            $this.attr('data-offx', (cx - off.left));
            $this.attr('data-offy', (cy - off.top));
        });
}

function storeViewState(store) {

    var dm = document.querySelector('#container');

    if (store) {

        //log('storeViewState()');

        viewState.zoomIdx = zoomIdx;
        viewState.left = dm.style.marginLeft;
        viewState.top = dm.style.marginTop;
    } else { // restore

        setZoom(zoomIdx = viewState.zoomIdx);
        dm.style.marginLeft = viewState.left;
        dm.style.marginTop = viewState.top;
    }
}

function centerZoom($ele) {

    if ($ele) {

        storeViewState(true);

        // compute target positions for transform
        var dm, margin = 10,
            metaOffset = 110,
            center = -5000,
            ww = $(window).width(),
            wh = $(window).height(),
            offx = parseInt($ele.attr('data-offx')),
            offy = parseInt($ele.attr('data-offy')),
            isText = $ele.find('.item-text-div').length,
            iw = (isText ? $ele.find('.item-text-div') : $ele.find('img')).width(),
            ih = (isText ? $ele.find('.item-text-div') : $ele.find('img')).height(),
            mleft = (center + offx - iw / 2),
            mtop = (center + offy - ih / 2);

        // make sure left/bottom corner of meta-data is onscreen (#180)
        if (iw > ww - (metaOffset * 2 + margin)) {

            //log('HITX:  iw='+iw+" ww="+ww+" diff="+(iw - ww)  + "  offx="+offx);
            mleft += ((iw - ww) / 2) + (metaOffset + margin);
        }
        if (ih > wh - (metaOffset * 2 + margin)) {

            //log('HITY:  ih='+ih+" wh="+wh+" diff="+(ih - wh)  + "  offy="+offy);
            mtop -= ((ih - wh) / 2) + (metaOffset + margin); // bottom-margin
        }

        // reset zoom to 100%
        setZoom(zoomIdx = 0);

        // translate to center
        dm = document.querySelector('#container');
        dm.style.marginLeft = mleft + 'px';
        dm.style.marginTop = mtop + 'px';
    } else { // restore zoom-state

        storeViewState(false);
    }
}

function lightboxMode(selected) {

    if (selected) var $selected = $(selected);

    if ($selected && !$selected.hasClass('inspected')) {

        var inspectedGid = parseInt($selected.attr('data-gid'));
        selectedAdSet = findAdSetByGid(inspectedGid); // throws

        $selected.addClass('inspected').siblings().removeClass('inspected');

        if (selectedAdSet.count() > 1) {

            $selected.find('span.counter-index').show(); // show index-counter
            bulletIndex($selected, selectedAdSet);

            animateInspector($selected);
        }

        var next = selectedAdSet.nextPending(); // tell the addon
        if (next && self.port) {

            self.port.emit("item-inspected", { "id": next.id });
        }

        centerZoom($selected);

        $('#container').addClass('lightbox');
    }
    else if ($('#container').hasClass('lightbox')) {

        var $item = $('.item.inspected');

        // reset the class to the group class
        setItemClass($item, selectedAdSet.groupState());

        // remove inspected & re-hide index-counter
        $item.removeClass('inspected');
        $item.find('span.counter-index').hide();

        selectedAdSet = null;

        // stop animation and restore view
        animateInspector(false);
        centerZoom(false);

        $('#container').removeClass('lightbox');
    }
}

function animateInspector($inspected) {

    animatorId && clearTimeout(animatorId); // stop

    // animate if we have a dup-ad being inspected
    if ($inspected && selectedAdSet && selectedAdSet.count() > 1) {

        animatorId = setInterval(function() {

                //log("selectedAdSet.count():" +selectedAdSet.index, $inspected.length);

                if (++selectedAdSet.index === selectedAdSet.count())
                    selectedAdSet.index = 0;

                bulletIndex($inspected, selectedAdSet);

            }, animateMs);
    }
}

function findAdById(id) {

    //log('findAdById: '+id);

    for (var i = 0, j = gAdSets.length; i < j; i++) {

        var childIdx = gAdSets[i].childIdxForId(id);

        if (childIdx > -1) {

            return {

                ad: gAdSets[i].child(childIdx),
                group: gAdSets[i],
                index: childIdx
            };
        }
    }

    error('[ERROR] Vault: No ad for ID#' + id + " gAdSets: ", gAdSets);

    self.port && self.port.emit("refresh-vault");
}

function findItemDivByGid(gid) {

    var $item, items = $('.item');
    for (var i = 0; i < items.length; i++) {

        $item = $(items[i]);
        if (parseInt($item.attr('data-gid')) === gid)
            return $item;
    }

    return null; // item may not be available if filtered
}

function findAdSetByGid(gid) {

    for (var i = 0, j = gAdSets.length; i < j; i++) {

        if (gAdSets[i].gid === gid)
            return gAdSets[i];
    }

    throw Error('No group for gid: ' + gid);
}

function attachTests() {

    $.getJSON(TEST_ADS, function(json) {

            warn("Vault.js :: Loading test-ads: " + TEST_ADS);
            if (Type.is(json, Type.O)) json = toAdArray(json); //BC
            layoutAds({
                    data: json,
                    page: TEST_PAGE
                }); // currentAd?

        }).fail(function(e) {
            warn("error(bad-json?):", e);
        });
}

function zoomIn(immediate) {

    (zoomIdx > 0) && setZoom(--zoomIdx, immediate);
}

function zoomOut(immediate) {

    (zoomIdx < Zooms.length - 1) && setZoom(++zoomIdx, immediate);
}

function setZoom(idx, immediate) {

    //log('setZoom('+idx+','+(immediate===true)+')');

    var $container = $('#container');

    // Disable transitions
    immediate && $container.addClass('notransition');

    $container.removeClass(zoomStyle).addClass // swap zoom class
    ((zoomStyle = ('z-' + Zooms[idx]).replace(/\./, '_')));

    $('#ratio').text(Zooms[idx] + '%'); // set zoom-text

    // Trigger reflow, flush cached CSS
    $container[0].offsetHeight;

    // Re-enable transitions
    immediate && $container.removeClass('notransition');
}

function onscreen($this, winW, winH, scale, percentVisible) {

    var off = $this.offset(),
        w = $this.width() * scale,
        h = $this.height() * scale,
        minX = (-w * (1 - percentVisible)),
        maxX = (winW - (w * percentVisible)),
        minY = (-h * (1 - percentVisible)),
        maxY = (winH - (h * percentVisible));

    //log('onscreen() :: trying: '+Zooms[zoomIdx]+"%",$this.attr('data-gid'),off.left, minX, maxX);

    if (off.left < minX || off.left > maxX || off.top < minY || off.top > maxY) {
        /*if (off.left < minX)
            log(i+ ") OFF-LEFT @ "+Zooms[zoomIdx]+"% ", off.left +" < "+minX);
        if (off.left > maxX)
            log(i+ ") OFF-RIGHT @ "+Zooms[zoomIdx]+"% ", off.left +" > "+maxX);
        if (off.top < minY)
            log(i+ ") OFF-TOP @ "+Zooms[zoomIdx]+"% ", off.top +" < "+minY);
        if (off.top > maxY)
            log(i+ ") OFF-BOTTOM @ "+Zooms[zoomIdx]+"% ", off.top +" > "+maxY);*/
        return false;
    }

    return true;
}

function openInNewTab(url) {

    window.open(url, '_blank').focus();
}

function asAdArray(adsets) { // remove

    var ads = [];
    for (var i = 0, j = adsets.length; i < j; i++) {
        for (var k = 0, m = adsets[i].children.length; k < m; k++)
            ads.push(adsets[i].children[k]);
    }
    return ads;
}

function addInterfaceHandlers(ads) {

    $('#x-close-button').click(function(e) {

            e.preventDefault();
            self.port && self.port.emit("close-vault");
        });

    $('#logo').click(function(e) {

            e.preventDefault();
            openInNewTab(LogoURL);
        });

    $(document).click(function(e) {

            //log(e.clientX,e.clientY);
            lightboxMode(false);
        });

    $(document).keyup(function(e) {

            (e.keyCode == 27) && lightboxMode(false); // esc
        });

    /////////// DRAG-STAGE ///////////
    // (from: http://jsfiddle.net/robertc/kKuqH/)

    var dm = document.querySelector('#container');
    if (dm) {

        dm.addEventListener('dragstart', dragStart, false);
        dm.addEventListener('dragover', dragOver, false);
        dm.addEventListener('dragend', dragEnd, false);
    }
    else {

        log("NO #CONTAINER!");
    }

    /////////// ZOOM-STAGE ///////////

    $('#z-in').click(function(e) {

            e.preventDefault();
            zoomIn();
        });

    $('#z-out').click(function(e) {

            e.preventDefault();
            zoomOut();
        });

    $(window).resize(function() {

            clearTimeout(resizeId); // only when done
            resizeId = setTimeout(createSlider, 100);
        });

    if (EnableContextMenu) {

        // if the document is clicked somewhere
        $(document).bind("mousedown", function(e) {

                // if the clicked element is not the menu
                if ($(e.target).parents(".custom-menu").length < 1) {

                    // Hide it
                    $(".custom-menu").hide(100);
                }
            });


        // if a context-menu element is right-clicked
        $(".custom-menu li").click(function() {

                log("right-click menu clicked: "+$(this).attr("data-action"));

                if (!selectedAdSet) {
                    error("No ");
                    return;
                }

                switch ( $(this).attr("data-action") ) {

                    case "delete":

                        var ids = selectedAdSet.childIds(),
                            $item = findItemDivByGid(selectedAdSet.gid);
                        
                        // remove the adset item from the DOM    
                        $item.remove();

                        // remove each ad from the full-adset
                        gAds = gAds.filter( function(ad) {
                            for (var i=0, len = ids.length; i<len; i++) {
                                if (ad.id === ids[i])
                                    return false;
                            }
                            return true;
                        });

                        // tell the addon
                        self.port && self.port.emit("delete-adset", { ids: selectedAdSet.childIds() });
                        
                        // recreate the slider
                        createSlider();
                        
                        break;

                    case "delete-all": // not enabled

                        self.port && self.port.emit("delete-all-similar", {});
                        break;
                }

                selectedAdSet = null;

                $(".custom-menu").hide(100); // close context-menu
            });
    }
}

function createAdSets(ads) { // once per layout

    //log('vault-slider.createAdSets: '+ads.length+'/'+ gAds.length+' ads');

    var key, ad, hash = {}, adsets = [];

    // set hidden val for each ad
    for (var i = 0, j = ads.length; i < j; i++) {

        ad = ads[i];

        key = computeHashKey(ad);

        if (!key) continue;

        if (!hash[key]) {

            // new: add a hash entry
            hash[key] = new AdSet(ad);
            adsets.push(hash[key]);
        }
        else {

            // dup: add as child
            hash[key].add(ad);
        }
    }

    // sort by foundTs and limit to MaxPerSet

    for (i = 0, j = adsets.length; i < j; i++) {

        adsets[i].children.sort(byField('-foundTs'));
        adsets[i].children = adsets[i].children.splice(0, MaxPerSet);
    }

    return adsets;
}

function repack() {

    var $container = $('#container'),
        $items = $(".item"),
        visible = $items.length;

    showAlert(visible ? false : 'no ads found');

    $container.imagesLoaded(function() {

            if (visible > 1) {

                var p = new Packery('#container', {
                        centered: {
                            y: 5000
                        }, // centered half min-height
                        itemSelector: '.item',
                        gutter: 1
                    });

                storeItemLayout($items);
                positionAds($items);
            }
            else if (visible == 1) {

                $items.css({ // center single

                        top: (5000 - $items.height() / 2) + 'px',
                        left: (5000 - $items.width() / 2) + 'px'
                    });

                storeItemLayout($items);
            }
        });
}
