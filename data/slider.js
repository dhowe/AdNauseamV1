$(document).ready(slider);

function sortAdsPerDay(ads) {

	var dateToCount = {}, d, days, days = [];
	for (var i=0; i < ads.length; i++) {
		
	  //d = new Date(ads[i].found), // TESTING ONLY
	  d = new Date(randomDate(new Date(2014, 5, 5), new Date())), 
	  	day = getDay(d);
	  //log(i+') checking: '+day + ' :: '+d);
	  
	  if (!dateToCount[day])
	  	dateToCount[day] = [];
	  
	  dateToCount[day].push(ads[i]);
	}
	
	var min=new Date(2099, 5, 5), max=new Date(1);
	for (var key in dateToCount) {	
		
	   if (dateToCount.hasOwnProperty(key))

			var obj = dateToCount[key], day = new Date(key);
			days.push({
				date : day,
				ads : obj,
				count : obj.length
			});
			
			if (day < min)
				min = day;
			if (day > max)
				max = day;
	}
	
	log('min = '+formatDate(min));
	log('max = '+formatDate(max));

	return days;
}

function slider() {

	var data = sortAdsPerDay(ads); 
	
	for (var i=0; i < data.length; i++) {
	  //log(i+") "+data[i].date+" -> "+data[i].count);
	};

	data = d3.range(500).map(Math.random);
	for (var i=0; i < data.length; i++) {
		data[i] = { date: randomDate(new Date(2014, 5, 5), new Date()), count: Math.random() * 10 };
	}
	
log(data.length + " days");
	
	// dimensions as vars:
	var margin = { top: 0, right: 130, bottom: 0, left: 20 },
	    width =  parseInt(d3.select("#left").style("width"), 10) - margin.left - margin.right,
	    height = 50 - margin.top - margin.bottom;

log("width: "+width);
log("height: "+height);

	// evenly spread on the x axis
	//var x = function() { return 1; }
	// d3.scale.linear().range([0, width]);
	//x = d3.scale.linear().range([0, width]);
	//var ex = d3.extent(data, function(d) { return d.date; });
	//log(ex);
	//x.domain(ex);
	
	// use the y axis for
	// var h = d3.scale.linear().range([height, 0]);  // return fun
	// console.log(h);
    // h = d3.random.normal(height / 2, height / 8);

	var parseDate = d3.time.format('%Y-%m-%d %H:%M:%S').parse;
	//var x = d3.scale.linear().range([0, width]);
	var x = d3.time.scale().range([0, width]);

	// use the y axis for
	var h = d3.random.normal(height / 2, height / 8);

	// add the svg and define its size
	var svg = d3.select("#stats").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
			.style("filter", "url(#drop-shadow)");

	//var xd = ;
	//var xfun = d3.time.scale().range([0, width]);
	//xfun.domain(d3.extent(data, function(d) { return d.date; }));
		
	//var yd = [0, d3.max(data, function(d) { return d.count; })]
	//var yfun = d3.scale.linear().domain(yd).range([height, 0]);
	 
    // setup the bars on the chart
	var rect = svg.append('g')
		.attr('class', 'bars')
		.selectAll('rect')
	    .data(data)
	  .enter().append('rect').attr({
		  width: 5,
		  height: function(d) { return h(d.count) },
		  x: function(d) { return x(d.date) },
		  y: 10
	  });
		/*	.attr("x", function(d) { return x(d)  })
			.attr("y", 10)
			.attr("width", 2)
			.attr("height", function(d) { return h(d) * 0.8 })			
		*/

	// start brush (range slider)
	var brush = d3.svg.brush()
			.x(x)
			.extent([.3, .5])
			.on("brushstart", brushstart)
			.on("brush", 	 brushmove)
			.on("brushend", brushend);

	var brushg = svg.append("g")
	    .attr("class", "brush")
	    .call(brush);

	// define the handles
	brushg.selectAll(".resize rect")
			.attr("height", height)
			.attr("width", 2)
			.attr("x", 0)
			.attr("fill", "#ccc")
			.attr("stroke-width",0)
			.attr("style", "visibility: visible");

	// set the height of the draggable scope
	brushg.selectAll("rect.extent")
			.attr("height", height)

	//these ones only for getting a widder hit area
	brushg.selectAll(".resize").append("rect")
				.attr("width", 10)
				.attr("x", -5)
				.attr("height", height )
				.attr("style", "visibility: hidden");

	brushstart();
	brushmove();

	function brushstart() {
	  svg.classed("selecting", true);
	}

	function brushmove() {
	  var s = brush.extent();
	  rect.classed("selected", function(d) { return s[0] <= d && d <= s[1]; });
	}

	function brushend() {
	  svg.classed("selecting", !d3.event.target.empty());
	}
	// end brush

	// define black drop shadow

	var defs = svg.append("defs");

	var filter = defs.append("filter")
			.attr("id", "drop-shadow")

	filter.append("feGaussianBlur")
			.attr("in", "SourceAlpha")
			.attr("stdDeviation", 0)
			.attr("result", "blur");
	filter.append("feOffset")
			.attr("in", "blur")
			.attr("dx", 1)
			.attr("dy", 0)
			.attr("result", "offsetBlur");

	var feMerge = filter.append("feMerge");

	feMerge.append("feMergeNode")
			.attr("in", "offsetBlur")
	feMerge.append("feMergeNode")
			.attr("in", "SourceGraphic");

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


function formatDate ( date ) {
    return weekdays[date.getDay()] + ", " +
        date.getDate() + nth(date.getDate()) + " " +
        months[date.getMonth()] + " " +
        date.getFullYear();
}

function log(m) { console.log(m); }

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getDay(dateObj) {
	
	var month = (dateObj.getUTCMonth() + 1);
	var day = (dateObj.getUTCDate());
	var year = dateObj.getUTCFullYear();
	return year + "/" + month + "/" + day;
}
