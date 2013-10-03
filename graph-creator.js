document.onload = (function(d3){
  "use strict";

  /** PREP **/
  var consts = {
    selectedClass: "selected",
    connectClass: "connect-node",
    circleGClass: "conceptG",
    BACKSPACE_KEY: 8,
    DELETE_KEY: 46,
    ENTER_KEY: 13,
    nodeRadius: 50
  };

  var state = {
    selectedNode: null,
    selectedEdge: null,
    mouseDownNode: null,
    mouseDownLink: null,
    justDragged: false,
    lastKeyDown: -1,
    shiftNodeDrag: false,
    selectedText: null
  };

  var height = window.innerHeight,
      width = window.innerWidth;

  var xLoc = width/2 - consts.nodeRadius/2,
      yLoc = 100;

  // initial node data
  var idct = 0;
  var nodes = [{title: "new concept", id: idct++, x: xLoc, y: yLoc},
               {title: "new concept", id: idct++, x: xLoc, y: yLoc + consts.nodeRadius*4}];
  var edges = [{source: nodes[1], target: nodes[0]}];


  /** MAIN SVG **/
  var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);
  
  // define arrow markers for graph links
  svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', "32")
    .attr('markerWidth', 3.5)
    .attr('markerHeight', 3.5)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

  // define arrow markers for leading arrow
  svg.append('svg:defs').append('svg:marker')
    .attr('id', 'mark-end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 0)
    .attr('markerWidth', 3.5)
    .attr('markerHeight', 3.5)
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
      circles = svg.append("g").selectAll("g"),
      fobjs = svg.selectAll("foreignObject");
  
  var drag = d3.behavior.drag()
        .origin(function(d){
          return {x: d.x, y: d.y};
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
      dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(svg.node())[0] + ',' + d3.mouse(svg.node())[1]);
    } else{
      d.x = d3.event.x;
      d.y =  d3.event.y;
      updateGraph();
    }
  }

  /* taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
  function selectElementContents(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
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

  function replaceSelectEdge(d3Path, edgeData){
    d3Path.classed(consts.selectedClass, true);
    if (state.selectedEdge){
      removeSelectFromEdge();
    }
    state.selectedEdge = edgeData;
  }

  function replaceSelectNode(d3Node, nodeData){
    d3Node.classed(consts.selectedClass, true);
    if (state.selectedNode){
      removeSelectFromNode();
    }
    state.selectedNode = nodeData;
  }
  
  function removeSelectFromNode(){
    circles.filter(function(cd){
      return cd.id === state.selectedNode.id;
    }).classed(consts.selectedClass, false);
    state.selectedNode = null;
  }

  function removeSelectFromEdge(){
    paths.filter(function(cd){
      return cd === state.selectedEdge;
    }).classed(consts.selectedClass, false);
    state.selectedEdge = null;
  }

  function pathMouseDown(d){
    d3.event.stopPropagation();
    state.mouseDownLink = d;
    var d3this = d3.select(this);

    if (state.selectedNode){
      removeSelectFromNode();
    }
    
    var prevEdge = state.selectedEdge;  
    if (!prevEdge || prevEdge !== d){
      replaceSelectEdge(d3this, d);
    } else{
      removeSelectFromEdge();
    }
  }

  // mousedown on node
  function circleMouseDown(d){
    d3.event.stopPropagation();
    state.mouseDownNode = d;
    if (d3.event.shiftKey){
      state.shiftNodeDrag = d3.event.shiftKey;
      // reposition dragged directed edge
      dragLine.classed('hidden', false)
        .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
      return;
    }
  }

  // mouseup on nodes
  function circleMouseUp(d){
    // reset the states
    state.shiftNodeDrag = false;
    var d3this = d3.select(this);
    d3this.classed(consts.connectClass, false);
    
    var mouseDownNode = state.mouseDownNode;
    
    if (!mouseDownNode) return;

    dragLine.classed("hidden", true);
    
    if (mouseDownNode !== d){
      // were in a different node create new edge for mousedown edge and add to graph
      var newEdge = {source: mouseDownNode, target: d};
      var filtRes = paths.filter(function(d){
        if (d.source === newEdge.target && d.target === newEdge.source){
          edges.splice(edges.indexOf(d), 1);
        }
        return d.source === newEdge.source && d.target === newEdge.target;
      });
      if (!filtRes[0].length){
        edges.push(newEdge);
        updateGraph();
      }
    } else{
      // we're in the same node
      if (state.justDragged) {
        // dragged, not clicked
        state.justDragged = false;
      } else{

        if (d3.event.shiftKey){
          // edit text content
          var tnode = fobjs.filter(function(fd){return fd === d;})
                .select("p")
                .node();
          tnode.focus();
          selectElementContents(tnode);
        } else{
          // clicked, not dragged
          if (state.selectedEdge){
            removeSelectFromEdge();
          }
          var prevNode = state.selectedNode;            
          
          if (!prevNode || prevNode.id !== d.id){
            replaceSelectNode(d3this, d);
          } else{
            removeSelectFromNode();
          }
        }
      }
      
    }

    state.mouseDownNode = null;
    return;
    
  } // end of circles mouseup

  // mousedown on main svg
  function svgMouseDown(){
    var xycoords = d3.mouse(d3.event.currentTarget);
    nodes.push({id: idct++, title: "new concept", x: xycoords[0], y: xycoords[1]});
    updateGraph();
  }

  // mouseup on main svg
  function svgMouseUp(){
    state.shiftNodeDrag = false;
    dragLine.classed("hidden", true);
    state.mouseDownNode = null;
  }

  function svgKeyDown() {
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

  function svgKeyUp() {
    state.lastKeyDown = -1;
  }

  // call to propagate changes to graph
  function updateGraph(){

    paths = paths.data(edges);
    
    // update existing paths
    paths.style('marker-end', 'url(#end-arrow)')
      .classed(consts.selectedClass, function(d){
        return d === state.selectedEdge;
      })
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
      .on("mousedown", pathMouseDown)
      .on("mouseup", function(d){
        state.mouseDownLink = null;
      });

    // remove old links
    paths.exit().remove();
    
    // update existing nodes
    circles = circles.data(nodes, function(d){ return d.id;});
    circles.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});

    // add new nodes
    var newGs= circles.enter()
          .append("g");

    newGs
      .classed(consts.circleGClass, true)
      .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
      .on("mouseover", function(d){        
        if (state.shiftNodeDrag){
          d3.select(this).classed(consts.connectClass, true);
        }
      })
      .on("mouseout", function(d){
        d3.select(this).classed(consts.connectClass, false);
      })
      .on("mousedown", circleMouseDown)
      .on("mouseup", circleMouseUp)
      .call(drag);

    newGs.append("circle")
      .attr("r", String(consts.nodeRadius));

    // remove old nodes
    circles.exit().remove();

    // update existing text (cannot place text in node's g element: https://github.com/metacademy/directed-graph-creator/issues/2)
    fobjs = fobjs.data(nodes, function(d){ return d.id;});

    fobjs.attr("x", function(d){return d.x- consts.nodeRadius*0.707;})
    .attr("y", function(d){return d.y- consts.nodeRadius*0.707;});
    
    fobjs.enter().append("foreignObject")
      .attr("x", function(d){return d.x - consts.nodeRadius*0.707;})
      .attr("y", function(d){return d.y - consts.nodeRadius*0.707;})
      .attr("height", consts.nodeRadius*1.42)
      .attr("width", consts.nodeRadius*1.42)
      .on("mousedown", function(d){d3.event.stopPropagation();})
      .append("xhtml:p")
      .attr("contentEditable", "true")
      .text(function(d){return d.title;})
      .on("keydown", function(d){
        d3.event.stopPropagation();
        d.title = this.textContent;
        if (d3.event.keyCode == consts.ENTER_KEY && !d3.event.shiftKey){
          this.blur();
        }
      });
    fobjs.exit().remove();
  }


  /** START THE APP **/
  // listen for key events
  d3.select(window).on("keydown", svgKeyDown).on("keyup", svgKeyUp);
  svg.on("mousedown", svgMouseDown);
  svg.on("mouseup", svgMouseUp);
  updateGraph();

})(window.d3);
