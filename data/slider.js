$(document).ready(slider);

function slider() {
	var data = d3.range(800).map(Math.random);

	var margin = {top: 0, right: 130, bottom: 0, left: 20},
	    width =  parseInt(d3.select("#left").style("width"), 10) - margin.left - margin.right,
	    height = 50 - margin.top - margin.bottom;

	var x = d3.scale.linear()
	    .range([0, width]);

	var y = d3.random.normal(height / 2, height / 8);

	var brush = d3.svg.brush()
	    .x(x)
	    .extent([.3, .5])
	    .on("brushstart", brushstart)
	    .on("brush", brushmove)
	    .on("brushend", brushend);

	var svg = d3.select("#stats").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
			.style("filter", "url(#drop-shadow)");

	var rect = svg.append("g")
		.attr("class", "bars")
		.selectAll("rect")
	    .data(data)
	  .enter().append("rect")
			.attr("x", function(d) { return x(d) })
			.attr("y", 10)
			.attr("width", 1)
			.attr("height", function(d) { return height - y(d) -10 })

	var brushg = svg.append("g")
	    .attr("class", "brush")
	    .call(brush);

	brushg.selectAll(".resize rect")
			.attr("height", height)
			.attr("width", 1)
			.attr("x", 0)
			.attr("fill", "#999")
			.attr("stroke-width",0)
			.attr("style", "visibility: visible");

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

	// black drop shadow

	var defs = svg.append("defs");

	var filter = defs.append("filter")
			.attr("id", "drop-shadow")

	filter.append("feGaussianBlur")
			.attr("in", "SourceAlpha")
			.attr("stdDeviation", 2)
			.attr("result", "blur");
	filter.append("feOffset")
			.attr("in", "blur")
			.attr("dx", 2)
			.attr("dy", 2	)
			.attr("result", "offsetBlur");

	var feMerge = filter.append("feMerge");

	feMerge.append("feMergeNode")
			.attr("in", "offsetBlur")
	feMerge.append("feMergeNode")
			.attr("in", "SourceGraphic");

}
