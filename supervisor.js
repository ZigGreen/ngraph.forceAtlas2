'use strict';
function getAllNodes(ngraph) {

}


/**
 * Sigma ForceAtlas2.5 Supervisor
 * ===============================
 *
 * Author: Guillaume Plique (Yomguithereal)
 * Version: 0.1
 */
var _root;

try {
    _root = Function('return this')() || (42, eval)('this');
} catch(e) {
    _root = window;
}

var workerFn = require('./worker')();

/**
 * Feature detection
 * ------------------
 */
var webWorkers = 'Worker' in _root;

/**
 * Supervisor Object
 * ------------------
 */
function Supervisor(graph, options) {
    var _this = this
        ;

    options = options || {};

    // _root URL Polyfill
    _root.URL = _root.URL || _root.webkitURL;

    // Properties
    this.graph = graph;
    this.ppn = 10;
    this.ppe = 3;
    this.config = {};
    this.shouldUseWorker =
        options.worker === false ? false : webWorkers;
    this.workerUrl = options.workerUrl;

    // State
    this.started = false;
    this.running = false;

    // Web worker or classic DOM events?
    if (this.shouldUseWorker) {
        if (!this.workerUrl) {
            var blob = this.makeBlob(workerFn);
            this.worker = new Worker(URL.createObjectURL(blob));
        }
        else {
            this.worker = new Worker(this.workerUrl);
        }

        // Post Message Polyfill
        this.worker.postMessage =
            this.worker.webkitPostMessage || this.worker.postMessage;
    }
    else {

        eval(workerFn);
    }

    // Worker message receiver
    this.msgName = (this.worker) ? 'message' : 'newCoords';
    this.listener = function (e) {

        // Retrieving data
        _this.nodesByteArray = new Float32Array(e.data.nodes);

        // If ForceAtlas2 is running, we act accordingly
        if (_this.running) {

            // Applying layout
            _this.applyLayoutChanges();

            // Send data back to worker and loop
            _this.sendByteArrayToWorker();

        }
    };

    (this.worker || document).addEventListener(this.msgName, this.listener);

    // Filling byteArrays
    this.graphToByteArrays();

    // Binding on kill to properly terminate layout when parent is killed
    /*        sigInst.bind('kill', function() {
     sigInst.killForceAtlas2();
     });*/
}

Supervisor.prototype.makeBlob = function (workerFn) {
    var blob;

    try {
        blob = new Blob([workerFn], {type: 'application/javascript'});
    }
    catch (e) {
        _root.BlobBuilder = _root.BlobBuilder ||
        _root.WebKitBlobBuilder ||
        _root.MozBlobBuilder;

        blob = new BlobBuilder();
        blob.append(workerFn);
        blob = blob.getBlob();
    }

    return blob;
};

Supervisor.prototype.graphToByteArrays = function () {
    var nodes = this.graph.nodes,
        edges = this.graph.edges,
        nbytes = nodes.length * this.ppn,
        ebytes = edges.length * this.ppe,
        nIndex = {},
        i,
        j,
        l;

    // Allocating Byte arrays with correct nb of bytes
    this.nodesByteArray = new Float32Array(nbytes);
    this.edgesByteArray = new Float32Array(ebytes);

    // Iterate through nodes
    for (i = j = 0, l = nodes.length; i < l; i++) {

        // Populating index
        nIndex[nodes[i].id] = j;
        var node =  nodes[i];
        // Populating byte array
        this.nodesByteArray[j] = node.x;
        this.nodesByteArray[j + 1] = node.y;
        this.nodesByteArray[j + 2] = 0;
        this.nodesByteArray[j + 3] = 0;
        this.nodesByteArray[j + 4] = 0;
        this.nodesByteArray[j + 5] = 0;
        this.nodesByteArray[j + 6] = 1 + this.graph.degree[node.id];
        this.nodesByteArray[j + 7] = 1;
        this.nodesByteArray[j + 8] = node.size || 0;
        this.nodesByteArray[j + 9] = 0;
        j += this.ppn;
    }

    // Iterate through edges
    for (i = j = 0, l = edges.length; i < l; i++) {
        this.edgesByteArray[j] = nIndex[edges[i].fromId];
        this.edgesByteArray[j + 1] = nIndex[edges[i].toId];
        this.edgesByteArray[j + 2] = edges[i].weight || 1;
        j += this.ppe;
    }
};

// TODO: make a better send function
Supervisor.prototype.applyLayoutChanges = function () {
    var nodes = this.graph.nodes,
        j = 0;

    // Moving nodes
    for (var i = 0, l = this.nodesByteArray.length; i < l; i += this.ppn) {
        nodes[j].x = this.nodesByteArray[i];
        nodes[j].y = this.nodesByteArray[i + 1];
        j++;
    }
};

Supervisor.prototype.sendByteArrayToWorker = function (action) {
    var content = {
        action: action || 'loop',
        nodes: this.nodesByteArray.buffer
    };

    var buffers = [this.nodesByteArray.buffer];

    if (action === 'start') {
        content.config = this.config || {};
        content.edges = this.edgesByteArray.buffer;
        buffers.push(this.edgesByteArray.buffer);
    }

    if (this.shouldUseWorker)
        this.worker.postMessage(content, buffers);
    else
        _root.postMessage(content, '*');
};

Supervisor.prototype.start = function () {
    if (this.running)
        return;

    this.running = true;


    if (!this.started) {

        // Sending init message to worker
        this.sendByteArrayToWorker('start');
        this.started = true;
    }
    else {
        this.sendByteArrayToWorker();
    }
};

Supervisor.prototype.stop = function () {
    if (!this.running)
        return;

    this.running = false;
};

Supervisor.prototype.killWorker = function () {
    if (this.worker) {
        this.worker.terminate();
    }
    else {
        _root.postMessage({action: 'kill'}, '*');
        document.removeEventListener(this.msgName, this.listener);
    }
};

Supervisor.prototype.configure = function (config) {

    // Setting configuration
    this.config = config;

    if (!this.started)
        return;

    var data = {action: 'config', config: this.config};

    if (this.shouldUseWorker)
        this.worker.postMessage(data);
    else
        _root.postMessage(data, '*');
};


function ForceAtlas2(graph, config) {
    // Create supervisor if undefined
    if (!this.supervisor)
        this.supervisor = new Supervisor(graph, config);

    // Configuration provided?
    if (config)
        this.supervisor.configure(config);
}


ForceAtlas2.prototype.start = function () {

    // Start algorithm
    this.supervisor.start();

    return this;
};

ForceAtlas2.prototype.stop = function () {
    if (!this.supervisor)
        return this;

    // Pause algorithm
    this.supervisor.stop();

    return this;
};

ForceAtlas2.prototype.kill = function () {
    if (!this.supervisor)
        return this;

    // Stop Algorithm
    this.supervisor.stop();

    // Kill Worker
    this.supervisor.killWorker();

    // Kill supervisor
    this.supervisor = null;

    return this;
};

ForceAtlas2.prototype.config = function (config) {
    if (!this.supervisor)
        this.supervisor = new Supervisor(this, config);

    this.supervisor.configure(config);

    return this;
};

ForceAtlas2.prototype.isRunning = function () {
    return !!this.supervisor && this.supervisor.running;
};

module.exports = ForceAtlas2;



