var Viva = require('./node_modules/vivagraphjs/src/viva');
var graphGenerator = Viva.Graph.generator();
var graph = graphGenerator.grid(20, 20);
var ForceAtlas2 = require('../Layout');

function onLoad() {
    var layout = ForceAtlas2(graph, {
        gravity: 1,
        linLogMode: false,
        strongGravityMode: false,
        slowDown: 0.5,
        outboundAttractionDistribution: false,
        iterationsPerRender: 1,
        barnesHutOptimize: false,
        barnesHutTheta: 0.5,
        worker: true
    });

/*    var layout = Viva.Graph.Layout.forceDirected(graph, {
        springLength : 30,
        springCoeff : 0.0008,
        dragCoeff : 0.01,
        gravity : -1.2,
        theta : 1
    });*/

    var graphics = Viva.Graph.View.webglGraphics();

    var renderer =  Viva.Graph.View.renderer(graph, {
        layout: layout,
        graphics: graphics
        , container: document.body
    });

    var graphRect = layout.getGraphRect();
    var graphSize = Math.min(graphRect.x2 - graphRect.x1, graphRect.y2 - graphRect.y1);
    var screenSize = Math.min(document.body.clientWidth, document.body.clientHeight);
    var desiredScale = screenSize / graphSize;
    zoomOut(desiredScale, 1);
    function zoomOut(desiredScale, currentScale) {
        // zoom API in vivagraph 0.5.x is silly. There is no way to pass transform
        // directly. Maybe it will be fixed in future, for now this is the best I could do:
        if (desiredScale < currentScale) {
            currentScale = renderer.zoomOut();
            setTimeout(function () {
                zoomOut(desiredScale, currentScale);
            }, 16);
        }
    }

    renderer.run(Infinity);

}

window.addEventListener('load', onLoad);