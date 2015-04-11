'use strict';


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
} catch (e) {
    _root = window;
}

var workerFn = require('./worker')();
var Rect = function Rect(x1, y1, x2, y2) {
    this.x1 = x1 || 0;
    this.y1 = y1 || 0;
    this.x2 = x2 || 0;
    this.y2 = y2 || 0;
};

/**
 * Feature detection
 * ------------------
 */
var webWorkers = 'Worker' in _root;

/**
 * Supervisor Object
 * ------------------
 */
function Supervisor(graph, config) {
    // Create supervisor if undefined
    this._init(graph, config);

    // Configuration provided?
    if (config)
        this.configure(config);
}

Supervisor.prototype._init = function (graph, options) {

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
    this._pending = false;

    // Web worker or classic DOM events?
    if (this.shouldUseWorker) {
        if (!this.workerUrl) {
            var blob = this._makeBlob(workerFn);
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
    var listener = this._onMessage.bind(this);

    (this.worker || document).addEventListener(this.msgName, listener);
    this.graphRect = new Rect(Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
    // Filling byteArrays
    this._graphToByteArrays();

};


Supervisor.prototype._onMessage = function (e) {

    // Retrieving data
    this.nodesByteArray = new Float32Array(e.data.nodes);

    this._applyLayoutChanges();

    this._pending = false;
    // If ForceAtlas2 is running, we act accordingly
    if (this.running) {

        // Send data back to worker and loop
        this._sendByteArrayToWorker();

    }
};


Supervisor.prototype._makeBlob = function (workerFn) {
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


Supervisor.prototype._graphToByteArrays = function () {
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
    this._refreshNodesByteArray();

    for (i = j = 0, l = nodes.length; i < l; i++, j += this.ppn )
        // Populating index
        nIndex[nodes[i].id] = j;

    // Iterate through edges
    for (i = j = 0, l = edges.length; i < l; i++) {
        this.edgesByteArray[j] = nIndex[edges[i].fromId];
        this.edgesByteArray[j + 1] = nIndex[edges[i].toId];
        this.edgesByteArray[j + 2] = edges[i].weight || 1;
        j += this.ppe;
    }
};


Supervisor.prototype._refreshNodesByteArray = function () {
    var minX = Number.MAX_VALUE,
        maxX = Number.MIN_VALUE,
        minY = Number.MAX_VALUE,
        maxY = Number.MIN_VALUE,
        nodes = this.graph.nodes,
        x,
        y,
        i,
        l,
        j;

    for (i = j = 0, l = nodes.length; i < l; i++) {

        var node = nodes[i];
        // Populating byte array
        this.nodesByteArray[j] = x = node.x;
        this.nodesByteArray[j + 1] = y = node.y;
        this.nodesByteArray[j + 2] = 0;
        this.nodesByteArray[j + 3] = 0;
        this.nodesByteArray[j + 4] = 0;
        this.nodesByteArray[j + 5] = 0;
        this.nodesByteArray[j + 6] = 1 + this.graph.degree[node.id];
        this.nodesByteArray[j + 7] = 1;
        this.nodesByteArray[j + 8] = node.size || 0;
        this.nodesByteArray[j + 9] = node.isPinned;
        j += this.ppn;

        if (minX > x)  minX = x;
        if (maxX < x)  maxX = x;
        if (minY > y)  minY = y;
        if (maxY < y)  maxY = y;

    }

    this.graphRect = new Rect(minX, minY, maxX, maxY);

};


// TODO: make a better send function
Supervisor.prototype._applyLayoutChanges = function () {

    var nodes = this.graph.nodes,
        j = 0,
        x,
        y;

    var minX = Number.MAX_VALUE,
        maxX = Number.MIN_VALUE,
        minY = Number.MAX_VALUE,
        maxY = Number.MIN_VALUE;

    // Moving nodes
    for (var i = 0, l = this.nodesByteArray.length; i < l; i += this.ppn) {

        if (!nodes[j].changed) {
            nodes[j].x = x = this.nodesByteArray[i];
            nodes[j].y = y = this.nodesByteArray[i + 1];
        } else {
            this.nodesByteArray[i] = x = nodes[j].x;
            this.nodesByteArray[i + 1] = y = nodes[j].y;
            this.nodesByteArray[i + 9] = nodes[j].isPinned;
            nodes[j].changed = false
        }

        if (minX > x)  minX = x;
        if (maxX < x)  maxX = x;
        if (minY > y)  minY = y;
        if (maxY < y)  maxY = y;

        j++;
    }

    this.graphRect = new Rect(minX, minY, maxX, maxY);

};


Supervisor.prototype._sendByteArrayToWorker = function (action) {
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
    this._pending = true;
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
Supervisor.prototype.config = Supervisor.prototype.configure;


Supervisor.prototype.start = function () {
    if (this.running)
        return;

    this.running = true;


    if (!this.started) {
        // Sending init message to worker
        this._sendByteArrayToWorker('start');
        this.started = true;
    }

    else this._sendByteArrayToWorker();

};
Supervisor.prototype.run = Supervisor.prototype.start;


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


Supervisor.prototype.step = function () {

    if (this.isPending()) return;
    this.start();
    this.stop();

    return false;
};


Supervisor.prototype.kill = function () {
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


Supervisor.prototype.getGraphRect = function () {
    return this.graphRect;
};


Supervisor.prototype.isRunning = function () {
    return this.running;
};


Supervisor.prototype.isPending = function () {
    return this._pending;
};


Supervisor.prototype.forceUpdate = function () {


    if (!this._pending)
        this._refreshNodesByteArray();
    else
        this._needUpdate = true;
};


module.exports = Supervisor;



