(function(d3){
  "use strict";

  /** PREP **/
  var consts = {
    selectedClass: "selected",
    connectClass: "connect-node",
    BACKSPACE_KEY: 8,
    DELETE_KEY: 46,
    nodeRadius: 50
  };

  var state = {
    selectedNode: null,
    selectedEdge: null,
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
    .attr('refX', consts.nodeRadius)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

  // define arrow markers for leading arrow
  svg.append('svg:defs').append('svg:marker')
    .attr('id', 'mark-end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 5)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

  // displayed when dragging between nodes
  var dragLine = svg.append('svg:path')
    .attr('class', 'link dragline hidden')
    .attr('d', 'M0,0L0,0')
    .style('marker-end', 'url(#mark-end-arrow)');

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
      d.x = d3.event.x;
      d.y = d3.event.y;
      updateGraph();
    }
  }

  // remove edges associated with a node
  function spliceLinksForNode(node) {
    var toSplice = edges.filter(function(l) {
      return (l.source === node || l.target === node);
    });
    toSplice.map(function(l) {
      edges.splice(edges.indexOf(l), 1);
    });
  }

  function removeSelectClassFromNode(nodeData){
    circles.selectAll("circle").filter(function(cd){
      return cd.id === nodeData.id;
    }).classed(consts.selectedClass, false);
  }

  function removeSelectClassFromEdge(edgeData){
    paths.filter(function(cd){
      return cd === edgeData;
    }).classed(consts.selectedClass, false);
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
    var selectedNode = state.selectedNode,
        selectedEdge = state.selectedEdge;

    switch(d3.event.keyCode) {
    case consts.BACKSPACE_KEY:
    case consts.DELETE_KEY:
      d3.event.preventDefault();
      if (selectedNode){
        nodes.splice(nodes.indexOf(selectedNode), 1);
        spliceLinksForNode(selectedNode);
        state.selectedNode = null;
        updateGraph();
      } else if (selectedEdge){
        edges.splice(edges.indexOf(selectedEdge), 1);
        state.selectedEdge = null;
        updateGraph();
      }
      break;
    }
  }

  function keyup() {
    state.lastKeyDown = -1;
  }

  // call to propagate changes to graph
  function updateGraph(){

    paths = paths.data(edges);
    
    // update existing paths
    paths.style('marker-end', 'url(#end-arrow)')
    .attr("d", function(d){
          return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
        });

    // add new paths
    paths.enter()
        .append("path")
        .style('marker-end','url(#end-arrow)')
        .classed("link", true)
        .attr("d", function(d){
          return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
        })
        .on("mousedown", function(d){
          state.mouseDownLink = d;
          var d3this = d3.select(this);
          if (state.selectedNode) removeSelectClassFromNode(state.selectedNode);
          
          var prevEdge = state.selectedEdge;  
          if (prevEdge){
            removeSelectClassFromEdge(prevEdge);
          }
          
          if (!prevEdge || prevEdge !== d){
            d3this.classed(consts.selectedClass, true);
            state.selectedEdge = d;
          } else{
            state.selectedEdge = null;
          }
        })
        .on("mouseup", function(d){
          state.mouseDownLink = null;
        });

    // remove old links
    paths.exit().remove();
    
    // update existing nodes
    circles = circles.data(nodes, function(d){ return d.id;});
    circles.selectAll("circle")
      .attr("cx", function(d){return d.x;})
      .attr("cy", function(d){return d.y;});

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
          dragLine
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

        dragLine.classed("hidden", true);
        
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
            if (state.selectedEdge) removeSelectClassFromEdge(state.selectedEdge);
            var prevNode = state.selectedNode;            
            if (prevNode){
              removeSelectClassFromNode(prevNode);
            }
            
            if (!prevNode || prevNode.id !== d.id){
              d3this.classed(consts.selectedClass, true);
              state.selectedNode = d;
            } else{
              state.selectedNode = null;
            }
          }
        }

        state.mouseDownNode = null;
        return;
        
      })
      .call(drag);

    // remove old nodes
    circles.exit().remove();
  }


  /** START THE APP **/
  // listen for key events
  d3.select(window).on("keydown", keydown).on("keyup", keyup);
  svg.on("mousedown", mousedown);
  svg.on("mouseup", mouseup);
  updateGraph();

})(window.d3);
