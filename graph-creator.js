(function(d3){
  "use strict";

  /** PREP **/
  var consts = {
    selectedClass: "selected-node",
    connectClass: "connect-node",
    BACKSPACE_KEY: 8,
    DELETE_KEY: 46,
    nodeRadius: 50
  };

  var state = {
    d3SelectedNode: null,
    mouseDownNode: null,
    mouseDownLink: null,
    justDragged: false,
    lastKeyDown: -1,
    shiftNodeDrag: false
  };

  var height = document.height,
      width = document.width;

  var xLoc = width/2 - consts.nodeRadius/2,
      yLoc = 100;

  // node data
  var idct = 0;
  var nodes = [{title: "node1", id: idct++, x: xLoc, y: yLoc},
               {title: "node2", id: idct++, x: xLoc, y: yLoc + consts.nodeRadius*4}];
  var edges = [{source: nodes[1], target: nodes[0]}];


  /** MAIN SVG **/
  var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);
  
  // define arrow markers for graph links
  svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

  // displayed when dragging between nodes
  var dragLine = svg.append('svg:path')
    .attr('class', 'link dragline hidden')
    .attr('d', 'M0,0L0,0');

  // svg nodes and edges
  var paths = svg.append("g").selectAll("g"),
      circles = svg.append("g").selectAll("g");
      
  
  var drag = d3.behavior.drag()
               .origin(function(){
                 var el = d3.select(this);
                 return {x: el.attr("cx"), y: el.attr("cy")};
               })
               .on("drag", function(args){
                 state.justDragged = true;
                 dragmove.call(this, args);
               })
               .on("dragend", function() {
                 // todo check if edge-mode is selected
               });

  function dragmove(d) {
    if (state.shiftNodeDrag){
      dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
    } else{
      d3.select(this)
        .attr("cx", d.x = d3.event.x)
        .attr("cy", d.y = d3.event.y);
    }
  }

  // mousedown on main svg
  function mousedown(){
    if (d3.event.shiftKey || state.mouseDownNode || state.mouseDownLink) return;
    var xycoords = d3.mouse(d3.event.currentTarget);
    nodes.push({id: idct++, title: "new concept", x: xycoords[0], y: xycoords[1]});
    updateGraph();
  }

  // mouseup on main svg
  function mouseup(){
    if(!state.mouseDownNode) return;
    
    state.shiftNodeDrag = false;
    dragLine.classed("hidden", true);
  }

  function keydown() {
    // make sure repeated key presses don't register for each keydown
    if(state.lastKeyDown !== -1) return;

    state.lastKeyDown = d3.event.keyCode;
    var selectedNode = state.d3SelectedNode;

    switch(d3.event.keyCode) {
    case consts.BACKSPACE_KEY:
    case consts.DELETE_KEY:
      d3.event.preventDefault();
      if (selectedNode){
        selectedNode.remove();
        state.d3SelectedNode = null;
      }
      break;
    }
  }

  function keyup() {
    state.lastKeyDown = -1;
  }

  // call to propagate changes to graph
  function updateGraph(){
    // update existing paths
    paths = paths.data(edges);

    paths.enter()
        .append("path")
        .classed("link", true)
        .attr("d", function(d){
          return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
        });

    // update existing nodes
      circles = circles.data(nodes, function(d){ return d.id;});

    // add new nodes
      circles.enter()
      .append("g")
      .append("circle")
      .attr("cx", function(d){return d.x;})
      .attr("cy", function(d){return d.y;})
      .attr("r", String(consts.nodeRadius))
      .on("mouseover", function(d){        
        if (state.shiftNodeDrag){
          d3.select(this).classed(consts.connectClass, true);
        }
      })
      .on("mouseout", function(d){
        d3.select(this).classed(consts.connectClass, false);
      })
      .on("mousedown", function(d){
        state.mouseDownNode = d;
        if (d3.event.shiftKey){
          state.shiftNodeDrag = d3.event.shiftKey;
          // reposition drag line
          dragLine.style('marker-end', 'url(#end-arrow)')
            .classed('hidden', false)
            .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
          return;
        }
      })
      .on("mouseup", function(d){
        // reset the states
        state.shiftNodeDrag = false;
        var d3this = d3.select(this);
        d3this.classed(consts.connectClass, false);
        
        var mouseDownNode = state.mouseDownNode;
        
        if (!mouseDownNode) return;

        if (mouseDownNode !== d){
          // were in a different node
          // create new edge for mousedown edge and add to graph
          edges.push({source: mouseDownNode, target: d});
          updateGraph();
        } else{
          // we're in the same node
          if (state.justDragged) {
            // dragged, not clicked
            state.justDragged = false;
          } else{
              // clicked, not dragged (shaken, not stirred)
            var prevNode = state.d3SelectedNode;            
            if (prevNode){
              prevNode.classed(consts.selectedClass, false);
            }
            
            if (!prevNode || prevNode.node() !== d3this.node()){
              d3this.classed(consts.selectedClass, true);
              state.d3SelectedNode = d3this;
            } else{
              state.d3SelectedNode = null;
            }
          }
        }

        state.mouseDownNode = null;
        return;
        
      })
      .call(drag);

  }


  /** START THE APP **/
  // listen for key events
  d3.select(window).on("keydown", keydown).on("keyup", keyup);
  svg.on("mousedown", mousedown);
  svg.on("mouseup", mouseup);
  updateGraph();

})(window.d3);
