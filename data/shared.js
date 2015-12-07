/*global warn:0, URL:0 */

// functions shared between various ui-views

var TEST_APPEND_IDS = true;

/*
 * Start with resolvedTargetUrl if available, else use targetUrl
 * Then extract the last domain from the (possibly complex) url
 */
function targetDomain(ad) {

  var result, url = ad.resolvedTargetUrl || ad.targetUrl,
    domains = extractDomains(url);

  if (domains.length)
    result = new URL(domains.pop()).hostname;
  else
    warn("[ERROR] '" + ad.targetUrl + "' url=" + url);

  if (result && TEST_APPEND_IDS)
    result += ' (#' + ad.id + ')';

  return result;
}

function extractDomains(fullUrl) { // used in targetDomain()

  var result = [], matches,
    regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

  while ((matches = regexp.exec(fullUrl)))
    result.push(matches[0]);

  return result;
}

function showAlert(msg) {

  if (msg) {

    $("#alert").removeClass('hide');
    $("#alert p").text(msg);
  }
  else {

    $("#alert").addClass('hide');
  }
}
