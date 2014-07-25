$(document).ready(slider);

function slider() {
	// random placeholder data:
	var data = d3.range(500).map(Math.random);

	// dimensions as vars:
	var margin = {top: 0, right: 130, bottom: 0, left: 20},
	    width =  parseInt(d3.select("#left").style("width"), 10) - margin.left - margin.right,
	    height = 50 - margin.top - margin.bottom;

	// evenly spread on the x axis
	var x = d3.scale.linear()
	    .range([0, width]);

	// use the y axis for
	var h = d3.random.normal(height / 2, height / 8);

	// add the svg and define its size
	var svg = d3.select("#stats").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
			.style("filter", "url(#drop-shadow)");

  //setup the bars on the chart
	var rect = svg.append("g")
		.attr("class", "bars")
		.selectAll("rect")
	    .data(data)
	  .enter().append("rect")
			.attr("x", function(d) { return x(d) })
			.attr("y", 10)
			.attr("width", 2)
			.attr("height", function(d) { return h(d) * 0.8 })

	// start brush (range slider)
	var brush = d3.svg.brush()
			.x(x)
			.extent([.3, .5])
			.on("brushstart", brushstart)
			.on("brush", brushmove)
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
