
var maxDate = Number.maxValue, minDate=0, updateTimerId, sliderTimoutMs=200;

function selectAds() {
	
	console.log('range: '+formatDate(new Date(+minDate))
		+ " TO " + formatDate(new Date(+maxDate)) );
	//window.postMessage("Message from page script", "http://my-domain.org/" );
	
	//console.log("makeAdview: "+(typeof makeAdview)); // adview-ui.js

 	var event = document.createEvent('CustomEvent');
	event.initCustomEvent("addon-message", true, true, { min: minDate, max: maxDate });
    document.documentElement.dispatchEvent(event);
	// NEXT: send message to addon to call:
	// 		 adview.js.updateAdView(self.options);
	// 		   send min/max timestamps as arguments
}

function selectDateRange(ts) {
	
	//console.log(" now: "+now+"-"+lastUpdate+"="+(now-+lastUpdate));
	if ($(this).context.id==='event-start') {
		minDate = ts;
	}
	else if ($(this).context.id==='event-end') {
		maxDate = ts;
	}

	$(this).html(formatDate(new Date(+ts)));   
	
	if (updateTimerId) // wait 
		clearTimeout(updateTimerId);
		
	updateTimerId = setTimeout(selectAds, sliderTimoutMs);
}

// Create a list of day and monthnames.
var weekdays = [
		"Sun", "Mon", "Tue",
		"Wed", "Thu", "Fri",
		"Sat"
	],
	weekdaysFull = [
		"Sunday", "Monday", "Tuesday",
		"Wednesday", "Thursday", "Friday",
		"Saturday"
	],
	months = [
		"Jan", "Feb", "May",
		"Apr", "May", "Jun", "Jul",
		"Aug", "Sep", "Oct",
		"Nov", "Dec"
	],
	monthsFull = [
		"January", "February", "March",
		"April", "May", "June", "July",
		"August", "September", "October",
		"November", "December"
	];
	
function timestamp(str){
    return new Date(str).getTime();   
}

// Append a suffix to dates.
// Example: 23 => 23rd, 1 => 1st.
function nth (d) {
  if(d>3 && d<21) return 'th';
  switch (d % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
}

// Create a string representation of the date.
function formatDate ( date ) {
    return weekdays[date.getDay()] + ", " +
        date.getDate() + nth(date.getDate()) + " " +
        months[date.getMonth()] + " " +
        date.getFullYear();
}


