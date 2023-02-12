//include Jquery
//include matrixMath

const INTERACTIVE_CANVAS_OVERLAY = "imageNoChanges_top";
const INTERACTIVE_CANVAS_OVERLAY_UI = "imageNoChanges_top_ui";
const DATABASE_CANVAS_OVERLAY = "imageNoChanges_bottom";
const DATABASE_CANVAS_OVERLAY_UI = "imageNoChanges_bottom_ui";

const MIN_CROPPING_POLYGON_AREA = 600;

const enum_TransformationOperation = {
    TRANSLATE: 1,
    UNIFORM_SCALE: 2,
    NON_UNIFORM_SCALE: 3,
    ROTATE: 4,
    CROP: 5,
    SKEW_X: 6,
    SKEW_Y: 7,
};

function convertTransformationObjectToTransformationMatrix(transformations, shapeCenter) {
    // if (!shapeCenter) {
    //     shapeCenter = transformations.transformationCenterPoint;
    // }

    // var transformationCenterPoint = transformations.transformationCenterPoint;
    let ret = getIdentityMatrix();

    ret = matrixMultiply(getTranslateMatrix_point(shapeCenter, -1), ret);
    //Scale
    ret = matrixMultiply(transformations.directionalScaleMatrix, ret);

    //Rotate
    ret = matrixMultiply(getRotationMatrix(transformations.rotation), ret);

    ret = matrixMultiply(getScaleMatrix(transformations.uniformScale, transformations.uniformScale), ret);


    //Rotate
    ret = matrixMultiply(getSkewMatrix(transformations.skew_x, transformations.skew_y), ret);

    ret = matrixMultiply(getTranslateMatrix_point(shapeCenter, 1), ret);

    //Translate
    ret = matrixMultiply(getTranslateMatrix_point(transformations.translate, -1), ret);

    return ret;
}

function _newLayer(layerImage) {
    return {
        nonTransformedImageOutline: buildRect(layerImage.width, layerImage.height),
        image: layerImage,
        appliedTransformationsMat: getIdentityMatrix(),
        visible: true,
        layerColour: [0, 0, 0], //used for canvas UI overlay elements
        colour: [255, 0, 0],//used for UI elements
        cachedCanvas: null
    };
}

function asyncLoadImage(src){
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = function() {
            resolve(img);
        };
        img.onerror = reject;
        img.src = src;
    })
}

function newLayer(src){
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = function() {
            resolve(_newLayer(img))
        };
        img.onerror = reject;
        img.src = src;
    })
}

async function addLayer(canvasState, imgSrc) {
    canvasState.layers.push(await newLayer(imgSrc));
    if (canvasState.layers.length == 1) {
        canvasState.activeLayer = canvasState.layers[0];
    }
}

function getIdentityTransformations() {
    return {
        transformationCenterPoint: [0, 0],
        uniformScale: 1,
        directionalScaleMatrix: getIdentityMatrix(),
        rotation: 0,
        skew_y: 0,
        skew_x: 0,
        translate: [0, 0]
    };
}

let g_drawingOptions = {
    liveupdate: false,
};

let g_transformState = null;

function newCanvasState() {
    return {
        activeLayer: null,
        layers : []
    }
}

async function newTransformState(imgSrc, interactiveTransform, databaseTransform) {

    interactiveTransform = (interactiveTransform == undefined)? getIdentityMatrix() : interactiveTransform;
    databaseTransform = (databaseTransform == undefined)? getIdentityMatrix() : databaseTransform;

    // Add the default layer
    let interactiveCanvasState = newCanvasState();
    let databaseCanvasState = newCanvasState();
    interactiveCanvasState.imageLayerCanvasContext = document.getElementById(INTERACTIVE_CANVAS_OVERLAY).getContext("2d");
    databaseCanvasState.imageLayerCanvasContext = document.getElementById(DATABASE_CANVAS_OVERLAY).getContext("2d");

    let p1 = addLayer(interactiveCanvasState, imgSrc);
    let p2 = addLayer(databaseCanvasState, imgSrc);
    await Promise.all([p1, p2]);

    interactiveCanvasState.layers[0].appliedTransformationsMat = interactiveTransform;
    databaseCanvasState.layers[0].appliedTransformationsMat = databaseTransform;

    interactiveCanvasState.activeLayer = interactiveCanvasState.layers[0];
    databaseCanvasState.activeLayer = databaseCanvasState.layers[0];
    return {
        drawingOptions: g_drawingOptions,
        activeCanvas: interactiveCanvasState,
        interactiveCanvasState: interactiveCanvasState,
        databaseCanvasState: databaseCanvasState,
        currentTransformationOperationState: enum_TransformationOperation.TRANSLATE,
        isMouseDownAndClickedOnCanvas: false,
        temporaryAppliedTransformations: getIdentityTransformations(),
    }
}

async function loadTransformationStateFromUrlData(urlData) {
    let transformData = JSON.parse(urlData);

    {
        let layers = transformData.interactiveCanvasState.layers;
        for (let i = 0; i < layers.length; i++) {
            //FIXME: batch these
            layers[i].image = await asyncLoadImage(layers[i].image);
            layers[i].cachedCanvas = null;
        }
        transformData.interactiveCanvasState.activeLayer = layers[0];
    }

    {
        let layers = transformData.databaseCanvasState.layers;
        for (let i = 0; i < layers.length; i++) {
            //FIXME: batch these
            layers[i].image = await asyncLoadImage(layers[i].image);
            layers[i].cachedCanvas = null;
        }
        transformData.databaseCanvasState.activeLayer = layers[0];
    }

    transformData.activeCanvas = transformData.interactiveCanvasState;
    transformData.interactiveCanvasState.imageLayerCanvasContext =
        document.getElementById("lookupCanvas").getContext("2d");
    transformData.databaseCanvasState.imageLayerCanvasContext =
        document.getElementById("databaseCanvas").getContext("2d");

    return transformData;
}

function wipeTemporaryAppliedTransformations() {
    g_transformState.temporaryAppliedTransformations = getIdentityTransformations();
}

function setCurrnetOperation(globalState, newState) {
    if (globalState == null) {
        return;
    }

    // setMode(enum_modes.transform);

    globalState.currentTransformationOperationState = newState;
    applyTransformationEffects(newState);
}

async function init_loadTransformStateAndImages(imgSrc, interactiveTransform, databaseTransform) {
    //check if we can load from the url
    let urlData = (new URLSearchParams(location.search)).get('transfromState');
    let transformState;
    if (true || urlData == null) {//FIXME:
        transformState = await newTransformState(imgSrc, interactiveTransform, databaseTransform);
    } else {
        transformState = await loadTransformationStateFromUrlData(urlData);
    }

    return transformState;
}

async function setDefaultTransformationValues() {
    if (g_transformState == null) {
        return;
    }

    let saved = enum_TransformationOperation.TRANSLATE;

    g_transformState = await newTransformState();

    setCurrnetOperation(saved);
    // g_flushCache = true;
    // draw();
    // findMatches();
}

function applyTransformationEffects(state) {
    if (state === enum_TransformationOperation.TRANSLATE) {
        $(".twoCanvasWrapper").addClass("move");
    } else {
        $(".twoCanvasWrapper").removeClass("move");
    }
}

function handleMouseMoveTranslate(pageMouseDownPosition, pageMousePosition, globalState) {
    var translateDelta = minusTwoPoints(pageMouseDownPosition, pageMousePosition);
    globalState.temporaryAppliedTransformations.translate = translateDelta;
}

function getDirectionalScaleMatrix(scaleX, scaleY, direction) {
    var ret = getIdentityMatrix();
    ret = matrixMultiply(ret, getRotationMatrix(direction));
    ret = matrixMultiply(ret, getScaleMatrix(scaleX, scaleY));
    ret = matrixMultiply(ret, getRotationMatrix(-direction));
    return ret;
}

function handleMouseMoveNonUniformScale(pageMouseDownPosition, pageMousePosition, globalState) {
    var mouseDownPoint = pageMouseDownPosition;
    var y = (pageMousePosition[1] - mouseDownPoint[1]);
    var x = (pageMousePosition[0] - mouseDownPoint[0]);

    var extraRotation = Math.atan2(y, x) * (180.0 / Math.PI) * -1;
    if (extraRotation < 0) {
        extraRotation = (360 + (extraRotation));
    }
    direction = extraRotation % 360;
    scale = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    scale += 50;//skip all the fractions, 1 is the minimum scale
    scale /= 50;
    scaleMatrix = getDirectionalScaleMatrix(Math.sqrt(scale), 1 / Math.sqrt(scale), -direction);
    globalState.temporaryAppliedTransformations.directionalScaleMatrix = scaleMatrix;
}

function handleMouseMoveUniformScale(pageMouseDownPosition, pageMousePosition, globalState) {
    var mouseDownPoint = pageMouseDownPosition;
    var y = (pageMousePosition[1] - mouseDownPoint[1]);
    // var x = (pageMousePosition.x - mouseDownPoint.x);

    scale = y;//(Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));

    if (y > 0) {
        scale += 100;
        scale = 1 / (scale / 100);
    } else {
        scale *= -1;//make y positive
        scale += 100;
        scale /= 100;
    }

    globalState.temporaryAppliedTransformations.uniformScale = scale;
}

function buildRectangularCroppingPolyFromLayer(layer) {
    return [
        [0, 0],
        [layer.image.width, 0],
        [layer.image.width, layer.image.height],
        [0, layer.image.height]
    ]

}

function handleMouseMoveRotate(pageMouseDownPosition, pageMousePosition, globalState) {
    const y = (pageMousePosition[1] - pageMouseDownPosition[1]);
    const x = (pageMousePosition[0] - pageMouseDownPosition[0]);

    let extraRotation = Math.atan2(y, x) * (180.0 / Math.PI);
    if (extraRotation < 0) {
        extraRotation = (360 + (extraRotation));
    }
    extraRotation = extraRotation % 360;
    globalState.temporaryAppliedTransformations.rotation = extraRotation;
}

function handleMouseMoveSkewX(pageMouseDownPosition, pageMousePosition, globalState) {
    const y = (pageMousePosition[1] - pageMouseDownPosition[1]);
    const x = (pageMousePosition[0] - pageMouseDownPosition[0]);

    let extraRotation = Math.atan2(y, x) * (180.0 / Math.PI);
    if (extraRotation < 0) {
        extraRotation = (360 + (extraRotation));
    }
    extraRotation = extraRotation % 360;
    globalState.temporaryAppliedTransformations.skew_x = extraRotation;
}

function handleMouseMoveSkewY(pageMouseDownPosition, pageMousePosition, globalState) {
    const y = (pageMousePosition[1] - pageMouseDownPosition[1]);
    const x = (pageMousePosition[0] - pageMouseDownPosition[0]);

    let extraRotation = Math.atan2(y, x) * (180.0 / Math.PI);
    if (extraRotation < 0) {
        extraRotation = (360 + (extraRotation));
    }
    extraRotation = extraRotation % 360;
    globalState.temporaryAppliedTransformations.skew_y = extraRotation;
}

function handleMouseMoveCrop(mousePosition, activeLayer) {
    const invMat = math.inv(activeLayer.appliedTransformationsMat);
    activeLayer.nonTransformedImageOutline.push(applyTransformationMatrixToPoint(mousePosition, invMat));
}

function filterPointsOutsideImage(imageOutline, imageDimensions) {
    var result = [];
    for (var i = 0; i < imageOutline.length; i++) {
        var point = imageOutline[i];
        var x = point[0], y = point[1];
        if (point[0] < 0) {
            x = 0;
        }
        if (point[0] > imageDimensions.width) {
            x = imageDimensions.width;
        }
        if (point[1] < 0) {
            y = 0;
        }
        if (point[1] > imageDimensions.height) {
            y = imageDimensions.height;
        }
        result.push([x, y]);
    }
    return result;
}

function handleMouseUpCrop(activeLayer) {

    const imageOutline = activeLayer.nonTransformedImageOutline;
    const imageDimensions = {
        width: activeLayer.image.width,
        height: activeLayer.image.height
    };
    activeLayer.nonTransformedImageOutline = filterPointsOutsideImage(imageOutline, imageDimensions);

    const area = calcPolygonArea(activeLayer.nonTransformedImageOutline);
    if (area < MIN_CROPPING_POLYGON_AREA) {
        activeLayer.nonTransformedImageOutline = buildRectangularCroppingPolyFromLayer(activeLayer);
        activeLayer.croppingPolygonInverseMatrix = getIdentityMatrix();
    }
}

function handleMouseUp(globalState) {
    switch (globalState.currentTransformationOperationState) {
        case enum_TransformationOperation.TRANSLATE:
            break;
        case enum_TransformationOperation.NON_UNIFORM_SCALE:
            break;
        case enum_TransformationOperation.UNIFORM_SCALE:
            break;
        case enum_TransformationOperation.ROTATE:
            break;
        case enum_TransformationOperation.SKEW_X:
            break;
        case enum_TransformationOperation.SKEW_Y:
            break;
        case enum_TransformationOperation.CROP:
            handleMouseUpCrop(globalState.activeCanvas.activeLayer);
            break;
        default:
            console.log("ERROR: Invalid state.");
            break;
    }

    wipeTemporaryAppliedTransformations();
}

function drawRotationEffect(pageMousePosition) {
    if (g_transformState.currentTransformationOperationState == enum_TransformationOperation.ROTATE
        || g_transformState.currentTransformationOperationState == enum_TransformationOperation.SKEW_X
        || g_transformState.currentTransformationOperationState == enum_TransformationOperation.SKEW_Y)
    {
        if (g_transformState.isMouseDownAndClickedOnCanvas) {
            _drawRotationUIElement(
                document.getElementById("shapeDemo_ui").getContext("2d"),
                g_transformState.pageMouseDownPosition,
                pageMousePosition,
                g_transformState.temporaryAppliedTransformations.transformationCenterPoint);
        }
    }
}

function handleMouseMoveOnDocument(pageMousePosition) {
    switch (g_transformState.currentTransformationOperationState) {
        case enum_TransformationOperation.TRANSLATE:
            handleMouseMoveTranslate(g_transformState.pageMouseDownPosition, pageMousePosition, g_transformState);
            break;
        case enum_TransformationOperation.NON_UNIFORM_SCALE:
            handleMouseMoveNonUniformScale(g_transformState.pageMouseDownPosition, pageMousePosition, g_transformState);
            break;
        case enum_TransformationOperation.UNIFORM_SCALE:
            handleMouseMoveUniformScale(g_transformState.pageMouseDownPosition, pageMousePosition, g_transformState);
            break;
        case enum_TransformationOperation.ROTATE:
            handleMouseMoveRotate(g_transformState.pageMouseDownPosition, pageMousePosition, g_transformState);
            break;
        case enum_TransformationOperation.SKEW_X:
            handleMouseMoveSkewX(g_transformState.pageMouseDownPosition, pageMousePosition, g_transformState);
            break;
        case enum_TransformationOperation.SKEW_Y:
            handleMouseMoveSkewY(g_transformState.pageMouseDownPosition, pageMousePosition, g_transformState);
            break;
        case enum_TransformationOperation.CROP:
            //ignore, handled in canvas on mouse move function
            break;
        default:
            console.log("ERROR: Invalid state.");
            break;
    }

    //some transformation use the clicked canvas position as the center of the transformation
    const clickedPosition = g_transformState.temporaryAppliedTransformations.transformationCenterPoint;
    const temporaryAppliedTransformationsMat = convertTransformationObjectToTransformationMatrix(g_transformState.temporaryAppliedTransformations, clickedPosition);

    const savedLayerMat = g_transformState.transformationMatBeforeTemporaryTransformations;
    // activeLayer.appliedTransformations = matrixMultiply(temporaryAppliedTransformationsMat, savedLayerMat);
    g_transformState.activeCanvas.activeLayer.appliedTransformationsMat = matrixMultiply(temporaryAppliedTransformationsMat, savedLayerMat);
}

function drawLayerImageOutline(ctx, imageOutlinePolygon) {
    if (imageOutlinePolygon.length === 0) {
        return;
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();

    ctx.moveTo(imageOutlinePolygon[0][0], imageOutlinePolygon[0][1]);
    for (var i = 1; i < imageOutlinePolygon.length; i++) {//i = 1 to skip first point
        var currentPoint = imageOutlinePolygon[i];
        ctx.lineTo(currentPoint[0], currentPoint[1]);
    }
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2196F3';
    ctx.stroke();
}

function cropCanvasImage(ctx, inPoints) {
    if (inPoints.length == 0) {
        return;
    }

    ctx.beginPath();
    drawPolygonPath(ctx, inPoints);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.fill('evenodd');
}

function getTemporaryCanvasContext(canvasSize) {
    let tempCanvasElement = document.createElement('canvas');
    tempCanvasElement.width = canvasSize.width;
    tempCanvasElement.height = canvasSize.height;

    return tempCanvasElement.getContext("2d");
}

function cropLayerImage(transformedImage, croppingPolygon) {

    var ctx = getTemporaryCanvasContext(transformedImage);
    ctx.drawImage(transformedImage, 0, 0);

    cropCanvasImage(ctx, croppingPolygon);
    return ctx.canvas;
}

function clearCanvasByContext(context) {
    const canvas = context.canvas;
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawImageOutlineWithLayer(canvasContext, layer) {
    const imageOutline = applyTransformationMatrixToAllKeypoints(layer.nonTransformedImageOutline, layer.appliedTransformationsMat);
    drawLayerImageOutline(canvasContext, imageOutline);
}

function drawImageOutlineInternal() {
    //
    // const referenceImageOutlineContext = document.getElementById('databaseCanvas_uipass').getContext('2d');
    // const referenceLayerUnderMouse = g_transformState.databaseCanvasState.imageOutlineHighlightLayer;
    // clearCanvasByContext(referenceImageOutlineContext);
    // if (referenceLayerUnderMouse != null) {
    //     drawImageOutlineWithLayer(referenceImageOutlineContext, referenceLayerUnderMouse);
    // }
    //
    // const interactiveImageOutlineContext = document.getElementById('lookupCanvas_uipass').getContext('2d');
    // const interactiveLayerUnderMouse = g_transformState.interactiveCanvasState.imageOutlineHighlightLayer;
    // clearCanvasByContext(interactiveImageOutlineContext);
    // if (interactiveLayerUnderMouse != null) {
    //     drawImageOutlineWithLayer(interactiveImageOutlineContext, interactiveLayerUnderMouse);
    // }

    // window.requestAnimationFrame(drawImageOutlineInternal);
}

function handleMouseMoveOnCanvas(canvasMousePosition) {
    switch (g_transformState.currentTransformationOperationState) {
        case enum_TransformationOperation.TRANSLATE:
            //do nothing
            break;
        case enum_TransformationOperation.NON_UNIFORM_SCALE:
            //do nothing
            break;
        case enum_TransformationOperation.UNIFORM_SCALE:
            //do nothing
            break;
        case enum_TransformationOperation.ROTATE:
            //do nothing
            break;
        case enum_TransformationOperation.CROP:
            const activeLayer = g_transformState.activeCanvas.activeLayer;
            handleMouseMoveCrop(canvasMousePosition, activeLayer);
            break;
        default:
            console.log("ERROR: Invalid state.");
            break;
    }
}

function handleMouseDownCrop(activeLayer) {
    //The nonTransformedImageOutline is never allowed to be an empty list
    //so onMouseUp if the nonTransformedImageOutline is still empty then
    //it is replaced with the outline of the image with no cropping
    activeLayer.nonTransformedImageOutline = [];
}

function getActiveLayerWithCanvasPosition(canvasMousePosition, layers, noMatchReturnValue) {
    for (let i = layers.length-1; i >= 0; i--) {
        let layer = layers[i];
        // Apply our transformation matrix to the non transformed image outline
        let imageOutline = applyTransformationMatrixToAllKeypoints(
            layer.nonTransformedImageOutline, layer.appliedTransformationsMat);
        // Take the cropping shape
        if (isPointInPolygon(canvasMousePosition, imageOutline)) {
            return layer;
        }
    }
    return noMatchReturnValue;

}

function handleMouseDownOnCanvas(pageMousePosition, canvasMousePosition) {

    g_transformState.pageMouseDownPosition = pageMousePosition;
    g_transformState.temporaryAppliedTransformations.transformationCenterPoint = canvasMousePosition;

    let currentActiveLayer = g_transformState.activeCanvas.activeLayer;
    const clickedActiveLayer = getActiveLayerWithCanvasPosition(canvasMousePosition,
        g_transformState.activeCanvas.layers, currentActiveLayer);

    g_transformState.activeCanvas.activeLayer = clickedActiveLayer;
    g_transformState.transformationMatBeforeTemporaryTransformations = clickedActiveLayer.appliedTransformationsMat;

    switch (g_transformState.currentTransformationOperationState) {
        case enum_TransformationOperation.TRANSLATE:
            //do nothing
            break;
        case enum_TransformationOperation.NON_UNIFORM_SCALE:
            //do nothing
            break;
        case enum_TransformationOperation.UNIFORM_SCALE:
            //do nothing
            break;
        case enum_TransformationOperation.ROTATE:
            //do nothing
            break;
        case enum_TransformationOperation.CROP:
            handleMouseDownCrop(clickedActiveLayer);
            break;
        default:
            console.log("ERROR: Invalid state.");
            break;
    }
}

function mouseMoveOnDocumentEvent(globalState, pageMousePosition) {
    if (globalState != null && globalState.isMouseDownAndClickedOnCanvas) {
        globalState.referenceImageHighlightedTriangle = null;
        globalState.activeCanvas.activeLayer.cachedCanvas = null;
        globalState.activeCanvas.imageOutlineHighlightLayer = globalState.activeCanvas.activeLayer;
        handleMouseMoveOnDocument(pageMousePosition);

        //clearOutputListAndWipeCanvas();//FIXME:
        // draw();
        trasformOperationDraw(globalState);
        globalState.activeCanvas.draw();

        // const isCrop = g_transformState.currentTransformationOperationState == enum_TransformationOperation.CROP;
        // const isCroppingEffectActive = g_transformState.isMouseDownAndClickedOnCanvas && isCrop;
        //
        // if (!isCroppingEffectActive && g_transformState.activeCanvas == g_transformState.interactiveCanvasState
        //     && g_transformState.drawingOptions.liveupdate)
        // {
        //     updateDatabaseCanvasHeap();
        //     updateLookupCanvasHeap();
        //     findMatches();
        // }
    }
}

function mouseUpEvent(globalState) {
    if (globalState != null && globalState.isMouseDownAndClickedOnCanvas) {
        handleMouseUp(globalState);
        globalState.isMouseDownAndClickedOnCanvas = false;
        trasformOperationDraw(globalState);
        // draw();
    }
}


function canvasMouseDownEvent(globalState, pageMousePosition, canvasMousePosition) {
    if (g_transformState == null) {
        return;
    }

    globalState.isMouseDownAndClickedOnCanvas = true;
    handleMouseDownOnCanvas(pageMousePosition, canvasMousePosition);
}

function canvasMouseMoveEvent(globalState, canvasMousePosition, canvasState) {
    if (globalState === undefined) {
        return;
    }

    const layers = globalState.activeCanvas.layers;
    globalState.activeCanvas.imageOutlineHighlightLayer = getActiveLayerWithCanvasPosition(canvasMousePosition, layers, null);

    if (globalState.isMouseDownAndClickedOnCanvas && canvasState == globalState.activeCanvas) {
        handleMouseMoveOnCanvas(canvasMousePosition);
        //FIXME: clearLowerUi();
    }
}


function _drawRotationUIElement(ctx, pageMouseDownPosition, pageMousePosition, outPos) {
    const dx = pageMousePosition[0] - pageMouseDownPosition[0];
    const dy = pageMousePosition[1] - pageMouseDownPosition[1];

    const targetDist = 100;Math.sqrt(dx**2 + dy**2);
    const resAngle = ((Math.atan2(dy, dx)));
    const resPoint = [ outPos[0] + targetDist*Math.cos(resAngle), outPos[1] + targetDist*Math.sin(resAngle) ];
    const side = [ outPos[0] + 100, outPos[1] ];

    drawline_m(ctx, [outPos, resPoint], 'red');
    drawline_m(ctx, [outPos, side], 'red');

    ctx.beginPath();

    if (resAngle > 0)
        ctx.arc(outPos[0], outPos[1], 50, 0, resAngle);
    else
        ctx.arc(outPos[0], outPos[1], 50, resAngle, 0);

    ctx.stroke();
}

//layers

function buildRect(x2, y2) {
    return [
        [0, 0],
        [x2, 0],
        [x2, y2],
        [0, y2]
    ]

}

function drawCroppingEffect(canvasContext, imageOutline) {
    canvasContext.beginPath();
    drawPolygonPath(canvasContext, buildRect(canvasContext.canvas.width, canvasContext.canvas.height));
    drawPolygonPath(canvasContext, imageOutline);
    canvasContext.globalCompositeOperation = 'source-over';
    canvasContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
    canvasContext.fill('evenodd');
}

function updateClickAndSeeImage() {

    const lookupCanvas = getCanvas("lookupCanvas");
    const c_clickandseeImageLeft = getCleanCanvas("clickandseeImageLeft");
    c_clickandseeImageLeft.ctx.drawImage(lookupCanvas.c, 0, 0);

    const databaseCanvas = getCanvas("databaseCanvas");
    const c_clickandseeImageRight = getCleanCanvas("clickandseeImageRight");
    c_clickandseeImageRight.ctx.drawImage(databaseCanvas.c, 0, 0);

}

function drawLayer(ctx, canvasState, layer) {
    if (true || layer.cachedCanvas == null) {
        const m_canvas = document.createElement('canvas');
        m_canvas.width = ctx.canvas.width;
        m_canvas.height = ctx.canvas.height;
        const m_context = m_canvas.getContext('2d');

        const transMat = layer.appliedTransformationsMat;
        // const drawingImage = cropLayerImage(layer.image, layer.nonTransformedImageOutline);
        drawImageWithTransformations(m_context, layer.image, transMat);
        //set the cache
        layer.cachedCanvas = m_canvas;
    }

    const isCrop = g_transformState.currentTransformationOperationState == enum_TransformationOperation.CROP;
    const isCroppingEffectActive = g_transformState.isMouseDownAndClickedOnCanvas && isCrop;
    const isActiveCanvas = g_transformState.activeCanvas == canvasState;
    const isActiveLayer = canvasState.activeLayer == layer;
    const dontCropImage = isActiveLayer && isCroppingEffectActive && isActiveCanvas;
    const skipUiLayer = isCroppingEffectActive && isActiveCanvas && !isActiveLayer;

    if (dontCropImage) {
        const transMat = layer.appliedTransformationsMat;
        drawImageWithTransformations(ctx, layer.image, transMat);
    } else {
        drawImageWithTransformations(ctx, layer.cachedCanvas, getIdentityMatrix());
    }
}

function _jsonReplacer(name, val) {
    if (name == "image") {
        return val.src;
    } else if (name == "activeCanvas" || name == "activeLayer" || name == "cachedCanvas") {
        return undefined;
    } else {
        return val;
    }
}

function getAngleBetweenTwoLines(point1, point2, midpoint) {
    const x1 = point1[0] - midpoint[0];
    const y1 = point1[1] - midpoint[1];

    const x2 = point2[0] - midpoint[0];
    const y2 = point2[1] - midpoint[1];
    const angle = math.atan2(y2, x2) - math.atan2(x1, y1);
    return angle * (180.0 / Math.PI);
}

function trasformOperationDraw(globalState) {
    if (globalState == null) {
        return;
    }

    // window.history.pushState("object or string", "Title", "index.html?"
    //     + "transfromState="
    //     + JSON.stringify(g_transformState, _jsonReplacer)+"");

    const c_lookupCanvas = document.getElementById(INTERACTIVE_CANVAS_OVERLAY);
    const c_lookupCanvas_ctx = c_lookupCanvas.getContext("2d");
    clearCanvasByContext(c_lookupCanvas_ctx);
    const c_databaseCanvas = document.getElementById(DATABASE_CANVAS_OVERLAY);
    const c_databaseCanvas_ctx = c_databaseCanvas.getContext("2d");
    clearCanvasByContext(c_databaseCanvas_ctx);

    for (let i = 0; i < globalState.interactiveCanvasState.layers.length; i++){
        const layer = globalState.interactiveCanvasState.layers[i];
        drawLayer(c_lookupCanvas_ctx, globalState.interactiveCanvasState, layer);
    }

    for (let i = 0; i < globalState.databaseCanvasState.layers.length; i++){
        const layer = globalState.databaseCanvasState.layers[i];
        drawLayer(c_databaseCanvas_ctx, globalState.databaseCanvasState, layer);
    }

    const isCrop = globalState.currentTransformationOperationState == enum_TransformationOperation.CROP;
    const isCroppingEffectActive = globalState.isMouseDownAndClickedOnCanvas && isCrop;
    if (isCroppingEffectActive) {
        const appliedTransformations = globalState.activeCanvas.activeLayer.appliedTransformationsMat;
        const imageOutlineToken1 = globalState.activeCanvas.activeLayer.nonTransformedImageOutline;
        const transformedImageOutline = applyTransformationMatrixToAllKeypoints(imageOutlineToken1, appliedTransformations);
        const canvasContext = globalState.activeCanvas.imageLayerCanvasContext;
        drawCroppingEffect(canvasContext, transformedImageOutline);
    }

    // const _c_lookupCanvas = getCleanCanvas("lookupCanvas");
    // const _c_databaseCanvas = getCleanCanvas("databaseCanvas");
    // _c_lookupCanvas.ctx.drawImage(c_lookupCanvas, 0, 0);
    // _c_databaseCanvas.ctx.drawImage(c_databaseCanvas, 0, 0);

    // drawOutputImageOrEdgeImage(_c_lookupCanvas.ctx);
    //
    // //FIXME: check active canvas and flush cache on heap update!!!
    // updateLookupCanvasHeap();
    // updateDatabaseCanvasHeap();

    // let jsonData = module.getContoursWithCurvature(lookup_canvas_wasm_heap.ptr,
    //     lookup_canvas_wasm_heap.width,
    //     lookup_canvas_wasm_heap.height,
    //     g_thresh,
    //     g_ratio, g_kernelSize, g_blurWidth, g_areaThresh,
    //     g_USE_DILATE,
    //     g_USE_ERODE_BEFORE,
    //     g_USE_ERODE_AFTER,
    //     g_EROSION_BEFORE_SIZE,
    //     g_DILATE_SIZE,
    //     g_EROSION_AFTER_SIZE);
    // const shapeData = JSON.parse(jsonData);
    // const c = document.getElementById("lookupCanvas2").getContext("2d");

    // for (let i = 0; i < shapeData['shapes'].length; i++ )
    {
        // const shapeToDraw = linesStrToLine(shapeData['shapes'][i]['shape']);
        // const curves = shapeData['shapes'][i]['curves'];
        // drawline_m(c, shapeToDraw);
        //
        //
        // let prevAngle = 0;
        // for (let j = 1; j < shapeToDraw.length-1; j++) {
        //     const prevPoint = shapeToDraw[j-1];
        //     const nextPoint = shapeToDraw[j+1];
        //     const angle =  getAngleBetweenTwoLines(prevPoint, nextPoint, shapeToDraw[j]);
        //     console.log(angle - prevAngle);
        //     if (Math.abs(angle - prevAngle) > 85) {
        //         drawPoint_m(c, shapeToDraw[j])
        //     }
        //     prevAngle = angle;
        // }
    }
}

//hooks
$(document).mousedown(function (e) {
    //ignore
});

$(document).mousemove(function (e) {
    if (g_transformState == null) {
        return;
    }

    const pageMousePosition = getCurrentPageMousePosition(e);
    mouseMoveOnDocumentEvent(g_transformState, pageMousePosition);
});

$(document).bind( "touchmove", function (e) {
    if (g_transformState == null) {
        return;
    }

    const pageMousePosition = [
        e.originalEvent.touches[0].pageX,
        e.originalEvent.touches[0].pageY
    ];
    if (g_transformState != null && g_transformState.isMouseDownAndClickedOnCanvas) {
        e.preventDefault();
    }
    mouseMoveOnDocumentEvent(g_transformState, pageMousePosition);
});

$(document).mouseup(function (e) {
    if (g_transformState == null) {
        return;
    }

    mouseUpEvent(g_transformState);
});

$(document).bind( "touchend", function (e) {
    if (g_transformState == null) {
        return;
    }

    mouseUpEvent(g_transformState)
});

$("#" + INTERACTIVE_CANVAS_OVERLAY_UI).mousedown(function (e) {
    if (g_transformState == null) {
        return;
    }

    e.preventDefault();

    g_transformState.activeCanvas = g_transformState.interactiveCanvasState;

    var canvasElem = $("#" + INTERACTIVE_CANVAS_OVERLAY_UI)[0];
    const pageMousePosition = getCurrentPageMousePosition(e);
    const canvasMousePosition = getCurrentCanvasMousePosition(e, canvasElem);
    canvasMouseDownEvent(g_transformState, pageMousePosition, canvasMousePosition);
});

$(document).on('touchstart', "#" + INTERACTIVE_CANVAS_OVERLAY_UI, function(e) {
    if (g_transformState == null) {
        return;
    }

    e.preventDefault();
    const pageMousePosition = [
        e.originalEvent.touches[0].pageX,
        e.originalEvent.touches[0].pageY
    ];
    var canvasElem = $("#" + INTERACTIVE_CANVAS_OVERLAY_UI)[0];
    const canvasMousePosition = getCurrentCanvasMousePosition(e, canvasElem);
    canvasMouseDownEvent(g_transformState, pageMousePosition, canvasMousePosition);
});


$("#" + INTERACTIVE_CANVAS_OVERLAY_UI).mousemove(function (e) {
    if (g_transformState == null) {
        return;
    }

    const canvasElem = $("#" + INTERACTIVE_CANVAS_OVERLAY_UI)[0];
    const canvasMousePosition = getCurrentCanvasMousePosition(e, canvasElem);

    canvasMouseMoveEvent(g_transformState, canvasMousePosition, g_transformState.interactiveCanvasState);
});

$(document).on('touchmove', "#" + INTERACTIVE_CANVAS_OVERLAY_UI, function(e) {
    if (g_transformState == null) {
        return;
    }

    e.preventDefault();
    var canvasElem = $("#" + INTERACTIVE_CANVAS_OVERLAY_UI)[0];
    const canvasMousePosition = getCurrentCanvasMousePosition(e, canvasElem);

    canvasMouseMoveEvent(g_transformState, canvasMousePosition, g_transformState.interactiveCanvasState);
});

$("#" + INTERACTIVE_CANVAS_OVERLAY_UI).mouseup(function (e) {
    if (g_transformState == null) {
        return;
    }
    //ignore
});



$("#" + DATABASE_CANVAS_OVERLAY_UI).mousedown(function (e) {
    if (g_transformState == null) {
        return;
    }

    e.preventDefault();

    g_flushCache = true;

    g_transformState.activeCanvas = g_transformState.databaseCanvasState;

    var canvasElem = $("#" + DATABASE_CANVAS_OVERLAY_UI)[0];
    const pageMousePosition = getCurrentPageMousePosition(e);
    const canvasMousePosition = getCurrentCanvasMousePosition(e, canvasElem);

    canvasMouseDownEvent(g_transformState, pageMousePosition, canvasMousePosition);
});

$(document).on('touchstart', "#" + DATABASE_CANVAS_OVERLAY_UI, function(e) {
    if (g_transformState == null) {
        return;
    }

    e.preventDefault();
    const pageMousePosition = [
        e.originalEvent.touches[0].pageX,
        e.originalEvent.touches[0].pageY
    ];
    var canvasElem = $("#" + DATABASE_CANVAS_OVERLAY_UI)[0];
    const canvasMousePosition = getCurrentCanvasMousePosition(e, canvasElem);
    canvasMouseDownEvent(g_transformState, pageMousePosition, canvasMousePosition);
});


$("#" + DATABASE_CANVAS_OVERLAY_UI).mousemove(function (e) {
    if (g_transformState == null) {
        return;
    }

    var canvasElem = $("#" + DATABASE_CANVAS_OVERLAY_UI)[0];
    const canvasMousePosition = getCurrentCanvasMousePosition(e, canvasElem);
    canvasMouseMoveEvent(g_transformState, canvasMousePosition, g_transformState.databaseCanvasState);
});

$(document).on('touchmove', "#" + DATABASE_CANVAS_OVERLAY_UI, function(e) {
    if (g_transformState == null) {
        return;
    }

    e.preventDefault();
    var canvasElem = $("#" + DATABASE_CANVAS_OVERLAY_UI)[0];
    const canvasMousePosition = getCurrentCanvasMousePosition(e, canvasElem);
    canvasMouseMoveEvent(g_transformState, canvasMousePosition, g_transformState.databaseCanvasState);
});

$("#" + DATABASE_CANVAS_OVERLAY_UI).mouseup(function (e) {
    if (g_transformState == null) {
        return;
    }
    //ignore
});
