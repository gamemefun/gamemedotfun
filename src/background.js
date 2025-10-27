

import * as THREE from "three";

const OrbitControls = function (object, domElement) {

  this.object = object;

  this.domElement = (domElement !== undefined) ? domElement : document;

  // Set to false to disable this control
  this.enabled = true;

  // "target" sets the location of focus, where the object orbits around
  this.target = new THREE.Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  this.minDistance = 0;
  this.maxDistance = Infinity;

  // How far you can zoom in and out ( OrthographicCamera only )
  this.minZoom = 0;
  this.maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
  this.minAzimuthAngle = - Infinity; // radians
  this.maxAzimuthAngle = Infinity; // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  this.enableDamping = false;
  this.dampingFactor = 0.25;

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  this.enableZoom = true;
  this.zoomSpeed = 1.0;

  // Set to false to disable rotating
  this.enableRotate = true;
  this.rotateSpeed = 1.0;

  // Set to false to disable panning
  this.enablePan = true;
  this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  this.enableKeys = true;

  // The four arrow keys
  this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

  // Mouse buttons
  this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

  // for reset
  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom;

  //
  // public methods
  //

  this.getPolarAngle = function () {

    return spherical.phi;

  };

  this.getAzimuthalAngle = function () {

    return spherical.theta;

  };

  this.saveState = function () {

    scope.target0.copy(scope.target);
    scope.position0.copy(scope.object.position);
    scope.zoom0 = scope.object.zoom;

  };

  this.reset = function () {

    scope.target.copy(scope.target0);
    scope.object.position.copy(scope.position0);
    scope.object.zoom = scope.zoom0;

    scope.object.updateProjectionMatrix();
    scope.dispatchEvent(changeEvent);

    scope.update();

    state = STATE.NONE;

  };

  // this method is exposed, but perhaps it would be better if we can make it private...
  this.update = function () {

    var offset = new THREE.Vector3();

    // so camera.up is the orbit axis
    var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    var quatInverse = quat.clone().inverse();

    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();

    return function update() {

      var position = scope.object.position;

      offset.copy(position).sub(scope.target);

      // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion(quat);

      // angle from z-axis around y-axis
      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {

        rotateLeft(getAutoRotationAngle());

      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi;

      // restrict theta to be between desired limits
      spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));

      // restrict phi to be between desired limits
      spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));

      spherical.makeSafe();


      spherical.radius *= scale;

      // restrict radius to be between desired limits
      spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

      // move target to panned location
      scope.target.add(panOffset);

      offset.setFromSpherical(spherical);

      // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion(quatInverse);

      position.copy(scope.target).add(offset);

      scope.object.lookAt(scope.target);

      if (scope.enableDamping === true) {

        sphericalDelta.theta *= (1 - scope.dampingFactor);
        sphericalDelta.phi *= (1 - scope.dampingFactor);

      } else {

        sphericalDelta.set(0, 0, 0);

      }

      scale = 1;
      panOffset.set(0, 0, 0);

      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if (zoomChanged ||
        lastPosition.distanceToSquared(scope.object.position) > EPS ||
        8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {

        scope.dispatchEvent(changeEvent);

        lastPosition.copy(scope.object.position);
        lastQuaternion.copy(scope.object.quaternion);
        zoomChanged = false;

        return true;

      }

      return false;

    };

  }();

  this.dispose = function () {

    scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
    scope.domElement.removeEventListener('mousedown', onMouseDown, false);
    scope.domElement.removeEventListener('wheel', onMouseWheel, false);

    scope.domElement.removeEventListener('touchstart', onTouchStart, false);
    scope.domElement.removeEventListener('touchend', onTouchEnd, false);
    scope.domElement.removeEventListener('touchmove', onTouchMove, false);

    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    window.removeEventListener('keydown', onKeyDown, false);

    //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

  };

  //
  // internals
  //

  var scope = this;

  var changeEvent = { type: 'change' };
  var startEvent = { type: 'start' };
  var endEvent = { type: 'end' };

  var STATE = { NONE: - 1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };

  var state = STATE.NONE;

  var EPS = 0.000001;

  // current position in spherical coordinates
  var spherical = new THREE.Spherical();
  var sphericalDelta = new THREE.Spherical();

  var scale = 1;
  var panOffset = new THREE.Vector3();
  var zoomChanged = false;

  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();

  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();

  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {

    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

  }

  function getZoomScale() {

    return Math.pow(0.95, scope.zoomSpeed);

  }

  function rotateLeft(angle) {

    sphericalDelta.theta -= angle;

  }

  function rotateUp(angle) {

    sphericalDelta.phi -= angle;

  }

  var panLeft = function () {

    var v = new THREE.Vector3();

    return function panLeft(distance, objectMatrix) {

      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
      v.multiplyScalar(- distance);

      panOffset.add(v);

    };

  }();

  var panUp = function () {

    var v = new THREE.Vector3();

    return function panUp(distance, objectMatrix) {

      v.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
      v.multiplyScalar(distance);

      panOffset.add(v);

    };

  }();

  // deltaX and deltaY are in pixels; right and down are positive
  var pan = function () {

    var offset = new THREE.Vector3();

    return function pan(deltaX, deltaY) {

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if (scope.object.isPerspectiveCamera) {

        // perspective
        var position = scope.object.position;
        offset.copy(position).sub(scope.target);
        var targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);

        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
        panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);

      } else if (scope.object.isOrthographicCamera) {

        // orthographic
        panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
        panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);

      } else {

        // camera neither orthographic nor perspective
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
        scope.enablePan = false;

      }

    };

  }();

  function dollyIn(dollyScale) {

    if (scope.object.isPerspectiveCamera) {

      scale /= dollyScale;

    } else if (scope.object.isOrthographicCamera) {

      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;

    }

  }

  function dollyOut(dollyScale) {

    if (scope.object.isPerspectiveCamera) {

      scale *= dollyScale;

    } else if (scope.object.isOrthographicCamera) {

      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;

    }

  }

  //
  // event callbacks - update the object state
  //

  function handleMouseDownRotate(event) {

    //console.log( 'handleMouseDownRotate' );

    rotateStart.set(event.clientX, event.clientY);

  }

  function handleMouseDownDolly(event) {

    //console.log( 'handleMouseDownDolly' );

    dollyStart.set(event.clientX, event.clientY);

  }

  function handleMouseDownPan(event) {

    //console.log( 'handleMouseDownPan' );

    panStart.set(event.clientX, event.clientY);

  }

  function handleMouseMoveRotate(event) {

    //console.log( 'handleMouseMoveRotate' );

    rotateEnd.set(event.clientX, event.clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart);

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

    rotateStart.copy(rotateEnd);

    scope.update();

  }

  function handleMouseMoveDolly(event) {

    //console.log( 'handleMouseMoveDolly' );

    dollyEnd.set(event.clientX, event.clientY);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {

      dollyIn(getZoomScale());

    } else if (dollyDelta.y < 0) {

      dollyOut(getZoomScale());

    }

    dollyStart.copy(dollyEnd);

    scope.update();

  }

  function handleMouseMovePan(event) {

    //console.log( 'handleMouseMovePan' );

    panEnd.set(event.clientX, event.clientY);

    panDelta.subVectors(panEnd, panStart);

    pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    scope.update();

  }

  function handleMouseUp(event) {

    // console.log( 'handleMouseUp' );

  }

  function handleMouseWheel(event) {

    // console.log( 'handleMouseWheel' );

    if (event.deltaY < 0) {

      dollyOut(getZoomScale());

    } else if (event.deltaY > 0) {

      dollyIn(getZoomScale());

    }

    scope.update();

  }

  function handleKeyDown(event) {

    //console.log( 'handleKeyDown' );

    switch (event.keyCode) {

      case scope.keys.UP:
        pan(0, scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.BOTTOM:
        pan(0, - scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.LEFT:
        pan(scope.keyPanSpeed, 0);
        scope.update();
        break;

      case scope.keys.RIGHT:
        pan(- scope.keyPanSpeed, 0);
        scope.update();
        break;

    }

  }

  function handleTouchStartRotate(event) {

    //console.log( 'handleTouchStartRotate' );

    rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);

  }

  function handleTouchStartDolly(event) {

    //console.log( 'handleTouchStartDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    dollyStart.set(0, distance);

  }

  function handleTouchStartPan(event) {

    //console.log( 'handleTouchStartPan' );

    panStart.set(event.touches[0].pageX, event.touches[0].pageY);

  }

  function handleTouchMoveRotate(event) {

    //console.log( 'handleTouchMoveRotate' );

    rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    rotateDelta.subVectors(rotateEnd, rotateStart);

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

    rotateStart.copy(rotateEnd);

    scope.update();

  }

  function handleTouchMoveDolly(event) {

    //console.log( 'handleTouchMoveDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    dollyEnd.set(0, distance);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {

      dollyOut(getZoomScale());

    } else if (dollyDelta.y < 0) {

      dollyIn(getZoomScale());

    }

    dollyStart.copy(dollyEnd);

    scope.update();

  }

  function handleTouchMovePan(event) {

    //console.log( 'handleTouchMovePan' );

    panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

    panDelta.subVectors(panEnd, panStart);

    pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    scope.update();

  }

  function handleTouchEnd(event) {

    //console.log( 'handleTouchEnd' );

  }

  //
  // event handlers - FSM: listen for events and reset state
  //

  function onMouseDown(event) {

    if (scope.enabled === false) return;

    event.preventDefault();

    switch (event.button) {

      case scope.mouseButtons.ORBIT:

        if (scope.enableRotate === false) return;

        handleMouseDownRotate(event);

        state = STATE.ROTATE;

        break;

      case scope.mouseButtons.ZOOM:

        if (scope.enableZoom === false) return;

        handleMouseDownDolly(event);

        state = STATE.DOLLY;

        break;

      case scope.mouseButtons.PAN:

        if (scope.enablePan === false) return;

        handleMouseDownPan(event);

        state = STATE.PAN;

        break;

    }

    if (state !== STATE.NONE) {

      document.addEventListener('mousemove', onMouseMove, false);
      document.addEventListener('mouseup', onMouseUp, false);

      scope.dispatchEvent(startEvent);

    }

  }

  function onMouseMove(event) {

    if (scope.enabled === false) return;

    event.preventDefault();

    switch (state) {

      case STATE.ROTATE:

        if (scope.enableRotate === false) return;

        handleMouseMoveRotate(event);

        break;

      case STATE.DOLLY:

        if (scope.enableZoom === false) return;

        handleMouseMoveDolly(event);

        break;

      case STATE.PAN:

        if (scope.enablePan === false) return;

        handleMouseMovePan(event);

        break;

    }

  }

  function onMouseUp(event) {

    if (scope.enabled === false) return;

    handleMouseUp(event);

    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    scope.dispatchEvent(endEvent);

    state = STATE.NONE;

  }

  function onMouseWheel(event) {

    if (scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ROTATE)) return;

    event.preventDefault();
    event.stopPropagation();

    handleMouseWheel(event);

    scope.dispatchEvent(startEvent); // not sure why these are here...
    scope.dispatchEvent(endEvent);

  }

  function onKeyDown(event) {

    if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

    handleKeyDown(event);

  }

  function onTouchStart(event) {

    if (scope.enabled === false) return;

    switch (event.touches.length) {

      case 1:	// one-fingered touch: rotate

        if (scope.enableRotate === false) return;

        handleTouchStartRotate(event);

        state = STATE.TOUCH_ROTATE;

        break;

      case 2:	// two-fingered touch: dolly

        if (scope.enableZoom === false) return;

        handleTouchStartDolly(event);

        state = STATE.TOUCH_DOLLY;

        break;

      case 3: // three-fingered touch: pan

        if (scope.enablePan === false) return;

        handleTouchStartPan(event);

        state = STATE.TOUCH_PAN;

        break;

      default:

        state = STATE.NONE;

    }

    if (state !== STATE.NONE) {

      scope.dispatchEvent(startEvent);

    }

  }

  function onTouchMove(event) {

    if (scope.enabled === false) return;

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {

      case 1: // one-fingered touch: rotate

        if (scope.enableRotate === false) return;
        if (state !== STATE.TOUCH_ROTATE) return; // is this needed?...

        handleTouchMoveRotate(event);

        break;

      case 2: // two-fingered touch: dolly

        if (scope.enableZoom === false) return;
        if (state !== STATE.TOUCH_DOLLY) return; // is this needed?...

        handleTouchMoveDolly(event);

        break;

      case 3: // three-fingered touch: pan

        if (scope.enablePan === false) return;
        if (state !== STATE.TOUCH_PAN) return; // is this needed?...

        handleTouchMovePan(event);

        break;

      default:

        state = STATE.NONE;

    }

  }

  function onTouchEnd(event) {

    if (scope.enabled === false) return;

    handleTouchEnd(event);

    scope.dispatchEvent(endEvent);

    state = STATE.NONE;

  }

  function onContextMenu(event) {

    if (scope.enabled === false) return;

    event.preventDefault();

  }

  //

  scope.domElement.addEventListener('contextmenu', onContextMenu, false);

  scope.domElement.addEventListener('mousedown', onMouseDown, false);
  scope.domElement.addEventListener('wheel', onMouseWheel, false);

  scope.domElement.addEventListener('touchstart', onTouchStart, false);
  scope.domElement.addEventListener('touchend', onTouchEnd, false);
  scope.domElement.addEventListener('touchmove', onTouchMove, false);

  window.addEventListener('keydown', onKeyDown, false);

  // force an update at start

  this.update();

};

OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
OrbitControls.prototype.constructor = OrbitControls;

Object.defineProperties(OrbitControls.prototype, {

  center: {

    get: function () {

      console.warn('THREE.OrbitControls: .center has been renamed to .target');
      return this.target;

    }

  },

  // backward compatibility

  noZoom: {

    get: function () {

      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      return !this.enableZoom;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      this.enableZoom = !value;

    }

  },

  noRotate: {

    get: function () {

      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      return !this.enableRotate;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      this.enableRotate = !value;

    }

  },

  noPan: {

    get: function () {

      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      return !this.enablePan;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      this.enablePan = !value;

    }

  },

  noKeys: {

    get: function () {

      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      return !this.enableKeys;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      this.enableKeys = !value;

    }

  },

  staticMoving: {

    get: function () {

      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      return !this.enableDamping;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      this.enableDamping = !value;

    }

  },

  dynamicDampingFactor: {

    get: function () {

      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      return this.dampingFactor;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      this.dampingFactor = value;

    }

  }

});

class SecondGrid {
  geometry;
  scene;
  coords;
  count;
  screenRatio;
  blueprint;
  sideLength;
  uv;
  rank;

  constructor(opt) {
    this.geometry = new THREE.InstancedBufferGeometry();
    this.scene = opt.scene;
    this.coords = opt.coords;
    this.count = opt.count;
    this.screenRatio = opt.screenRatio;

    this.createBlueprint();
    this.instanceBlueprint();
  }

  createBlueprint() {
    this.blueprint = this.coords;

    this.sideLength = Math.sqrt(
      Math.pow(this.blueprint[0] - this.blueprint[3], 2) +
      Math.pow(this.blueprint[1] - this.blueprint[4], 2)
    );
    this.uv = [0, 0.5, 0.5, 0.14, 0.5, 0.86, 0.5, 0.14, 1, 0.5, 0.5, 0.86];
    console.log(this.coords);

    let position = new THREE.BufferAttribute(
      new Float32Array(this.blueprint),
      3
    );
    console.log(this.geometry)
    this.geometry.addAttribute("position", position);
    let uv = new THREE.BufferAttribute(new Float32Array(this.uv), 2);
    this.geometry.addAttribute("uv", uv);
  }

  instanceBlueprint() {
    var translation = new Float32Array(this.count * 3);

    var uvOffset = new Float32Array(this.count * 2);
    var uvScales = new Float32Array(this.count * 2);

    var uvOffsetIterator = 0;
    var uvScalesIterator = 0;
    //and iterators for convenience :)
    var translationIterator = 0;
    this.rank = -1;

    let uvScale = new THREE.Vector2(1 / 60, 1 / 60);

    for (let i = 0; i < 120; i++) {
      for (let j = 0; j < 60; j++) {
        this.rank++;

        uvScales[uvScalesIterator++] = uvScale.x;
        uvScales[uvScalesIterator++] = uvScale.y;
        if (i % 2 == 0) {
          translation[translationIterator++] =
            2 * (Math.sin(Math.PI / 3) * this.sideLength * j) -
            Math.abs(
              this.screenRatio.x * 2 -
              2 * (Math.sin(Math.PI / 3) * this.sideLength) * 60
            ) /
            2;
          translation[translationIterator++] =
            (i * this.sideLength) / 2 -
            this.sideLength * 60 +
            Math.abs(-this.screenRatio.y * 2 - this.sideLength * 60) / 2;
          translation[translationIterator++] = 0;
          uvOffset[uvOffsetIterator++] = j * uvScale.x;
          uvOffset[uvOffsetIterator++] = 0.36 * i * uvScale.y;
        } else {
          translation[translationIterator++] =
            2 * (Math.sin(Math.PI / 3) * this.sideLength * j) +
            Math.sin(Math.PI / 3) * this.sideLength -
            Math.abs(
              this.screenRatio.x * 2 -
              2 * (Math.sin(Math.PI / 3) * this.sideLength) * 60
            ) /
            2;
          translation[translationIterator++] =
            (i * this.sideLength) / 2 -
            this.sideLength * 60 +
            Math.abs(-this.screenRatio.y * 2 - this.sideLength * 60) / 2;
          translation[translationIterator++] = 0;
          uvOffset[uvOffsetIterator++] = j * uvScale.x + 0.5 / 6;
          uvOffset[uvOffsetIterator++] = 0.36 * i * uvScale.y;
        }
      }
    }
    this.geometry.addAttribute(
      "translation",
      new THREE.InstancedBufferAttribute(translation, 3, 1)
    );

    this.geometry.addAttribute(
      "uvOffset",
      new THREE.InstancedBufferAttribute(uvOffset, 2, 1)
    );
    this.geometry.addAttribute(
      "uvScale",
      new THREE.InstancedBufferAttribute(uvScales, 2, 1)
    );
    //   video = document.createElement( 'video' );
    // // video.id = 'video';
    // // video.type = ' video/ogg; codecs="theora, vorbis" ';
    // video.src = "../Untitled.mp4";
    // video.load(); // must call after setting/changing source
    // video.play();

    // var texture = new THREE.VideoTexture( video );
    // texture.minFilter = THREE.LinearFilter;
    // texture.magFilter = THREE.LinearFilter;
    // texture.format = THREE.RGBFormat;

    let material = new THREE.RawShaderMaterial({
      uniforms: {
        u_time: {
          //@ts-expect-error
          type: "f",
          value: 1.0,
        },
        //@ts-expect-error

        envmap: { type: "t", value: null },
        //@ts-expect-error
        texture: { type: "t", value: null },
      },

      vertexShader: document.getElementById("vertShader").innerHTML,
      fragmentShader: document.getElementById("fragShader").innerHTML,
      side: THREE.DoubleSide,
      wireframe: false,
    });

    var co = "http://crossorigin.me/",
      url =
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/2017/leopard_stalking.jpg",
      src = co + url;

    var tl = new THREE.TextureLoader();
    tl.setCrossOrigin("Anonymous");
    tl.load(
      "data:image/jpeg;base64,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",
      function (t) {
        material.uniforms.envmap.value = t;
      }
    );

    this.grid = new THREE.Mesh(this.geometry, material);
    this.scene.add(this.grid);
  }
}

class createApp {
  constructor(opt) {
    this.winWidth = window.innerWidth;
    this.winHeight = window.innerHeight;
    this.winRatio = this.winWidth / this.winHeight;
    this.camera = new THREE.PerspectiveCamera(50, this.winRatio, 0.005, 1000);
    this.camera2 = new THREE.PerspectiveCamera(50, this.winRatio, 0.005, 1000);
    this.camera.setFocalLength(50);
    this.camera2.setFocalLength(50);
    this.camera.position.z = 1;
    this.camera2.position.z = 0.015;
    this.controls = new OrbitControls(this.camera2);
    this.controls.enableRotate = false;
    this.target = new THREE.Vector3();
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.winWidth, this.winHeight);

    document.body.appendChild(this.renderer.domElement);

    window.addEventListener("resize", this.onResize.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));

    this.rawCoords = [
      {
        x: this.winWidth / 101,
        y: 0,
      },

      {
        x: (Math.cos((2 * Math.PI) / 3) * this.winWidth) / 101,
        y: (Math.sin((2 * Math.PI) / 3) * this.winWidth) / 101,
      },
      {
        x: (Math.cos(((2 * Math.PI) / 3) * 2) * this.winWidth) / 101,
        y: (Math.sin(((2 * Math.PI) / 3) * 2) * this.winWidth) / 101,
      },
    ];

    this.rawCoords2 = [
      {
        x: -this.winWidth / 60,
        y: 0,
      },

      {
        x: (-Math.cos((-2 * Math.PI) / 3) * this.winWidth) / 60,
        y: (-Math.sin((-2 * Math.PI) / 3) * this.winWidth) / 60,
      },
      {
        x: (-Math.cos(((-2 * Math.PI) / 3) * 2) * this.winWidth) / 60,
        y: (-Math.sin(((-2 * Math.PI) / 3) * 2) * this.winWidth) / 60,
      },

      {
        x: (-Math.cos((-2 * Math.PI) / 3) * this.winWidth) / 60,
        y: (-Math.sin((-2 * Math.PI) / 3) * this.winWidth) / 60,
      },
      {
        x: (2 * this.winWidth) / 60,
        y: 0,
      },
      {
        x: (-Math.cos(((-2 * Math.PI) / 3) * 2) * this.winWidth) / 60,
        y: (-Math.sin(((-2 * Math.PI) / 3) * 2) * this.winWidth) / 60,
      },
    ];

    // let geo = new THREE.PlaneGeometry(10,10,120,120);
    // let mat = new THREE.MeshBasicMaterial({color:"#ffffff",wireframe:true})

    // let meshh = new THREE.Mesh(geo, mat)
    // this.scene.add(meshh)
    // meshh.rotation.z = Math.PI/4

    this.treatedCoords = [];

    this.light = new THREE.PointLight(0xffffff);
    this.light.position.set(0, 0, 0.6);
    this.scene.add(this.light);

    this.time = 0;
    this.initCoords();
    this.animate();
  }

  initCoords() {
    for (let i = 0; i < this.rawCoords2.length; i++) {
      let treatedCoordsX = (this.rawCoords2[i].x / this.winWidth) * 2 - 1;
      let treatedCoordsY = -(this.rawCoords2[i].y / this.winHeight) * 2 + 1;

      this.newPos = new THREE.Vector3(
        treatedCoordsX,
        treatedCoordsY,
        -1
      ).unproject(this.camera);
      this.treatedCoords.push(this.newPos.x, this.newPos.y, this.newPos.z);
    }
    this.grid2 = new SecondGrid({
      count: 7200,
      scene: this.scene,
      coords: this.treatedCoords,
      screenRatio: new THREE.Vector3(1, -1, -1).unproject(this.camera),
    });
    //this.grid = new Grid({count: 10201, scene: this.scene, coords:this.treatedCoords, screenRatio: new THREE.Vector3(1, -1,-1).unproject(this.camera)})
  }

  onMouseMove(e) {
    let mouseX = e.clientX;
    let mouseY = e.clientY;

    this.mouseX = (mouseX / this.winWidth) * 2 - 1;
    this.mouseY = -(mouseY / this.winHeight) * 2 + 1;
  }

  onResize() {
    this.winWidth = window.innerWidth;
    this.winHeight = window.innerHeight;
    this.winRatio = this.winWidth / this.winHeight;
    this.camera2.aspect = this.winRatio;
    this.camera2.updateProjectionMatrix();
    this.renderer.setSize(this.winWidth, this.winHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    this.camera2.lookAt(this.target);
    this.time += 1;
    // this.grid.grid.material.uniforms.u_time.value = this.time
    this.grid2.grid.material.uniforms.u_time.value = this.time;

    // this.mousePos = new THREE.Vector3(this.mouseX, this.mouseY,-1).unproject(this.camera)
    // this.grid.grid.material.uniforms.u_mouse.value.x = this.mousePos.x
    // this.grid.grid.material.uniforms.u_mouse.value.y = this.mousePos.y

    //this.grid.grid.material.uniforms.u_time = this.time
    this.renderer.render(this.scene, this.camera2);
  }
}

new createApp();
